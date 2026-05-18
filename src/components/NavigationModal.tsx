/**
 * NavigationModal — navegação GPS em duas fases:
 *
 *   FASE 1 — PREVIEW
 *   - Mostra a rota no mapa
 *   - Sem voz, sem câmera-follow, sem haptics
 *   - Botão grande "Iniciar navegação" + opção "Cancelar"
 *
 *   FASE 2 — NAVIGATING
 *   - Câmera segue usuário com heading (3D tilt 55°)
 *   - Voz turn-by-turn (TTS) com 4 thresholds de distância
 *   - Vibrações hápticas em manobras próximas
 *   - Re-rota automática se sair do caminho
 *   - Usuário é uma SETA que rotaciona pela direção
 *
 *   Detecção de chegada em ambas as fases.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../hooks/useT';
import { useAppStore } from '../store/appStore';
import {
  computeRoute,
  currentStepIndex,
  distanceToPolyline,
  haversineMeters,
  bearingDegrees,
  maneuverIcon,
  Coords,
  RouteResult,
  RouteStep,
} from '../services/routesService';
import { track } from '../services/analytics';

interface Props {
  visible: boolean;
  destination: Coords;
  destinationLabel: string;
  destinationEmoji?: string;
  onClose: () => void;
}

const GOOGLE_API_KEY: string =
  (Constants.expoConfig?.extra as any)?.googleMapsApiKey
  || (Constants.expoConfig?.android as any)?.config?.googleMaps?.apiKey
  || '';

const OFF_ROUTE_THRESHOLD_M = 60;
const REROUTE_DEBOUNCE_MS   = 8000;
const VOICE_THRESHOLDS      = [600, 300, 80, 20];

/** Fala com voz suave — pitch e rate calibrados para sonoridade mais natural */
function speak(text: string, priority = false) {
  try {
    if (priority) Speech.stop();
    Speech.speak(text, {
      language: 'pt-BR',
      pitch: 1.05,   // ligeiramente mais agudo = mais natural em PT-BR
      rate: 0.88,    // um pouco mais lento = mais claro
    });
  } catch {}
}

/** Thresholds adaptados à velocidade do usuário (km/h) */
function voiceThresholds(speedKmh: number | null): number[] {
  if (speedKmh == null || speedKmh < 20) return [300, 100, 30, 10]; // pedestre/lento
  if (speedKmh < 60) return [450, 200, 60, 15];                     // urbano
  return [700, 350, 100, 20];                                        // rodovia
}

type Phase = 'preview' | 'navigating';

// ═══════════════════════════════════════════════════════════════════════════════

export function NavigationModal({
  visible,
  destination,
  destinationLabel,
  destinationEmoji = '📍',
  onClose,
}: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastRerouteAtRef = useRef<number>(0);
  const prevUserPosRef = useRef<Coords | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());

  const cachedLat = useAppStore((s) => s.userLat);
  const cachedLon = useAppStore((s) => s.userLon);
  const initialOrigin: Coords | null =
    cachedLat != null && cachedLon != null
      ? { latitude: cachedLat, longitude: cachedLon }
      : null;

  const [phase, setPhase] = useState<Phase>('preview');
  const [userPos, setUserPos] = useState<Coords | null>(initialOrigin);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [userSpeed, setUserSpeed] = useState<number | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(false); // só ativa na fase navigating
  const [showStepsList, setShowStepsList] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // ─── Reset ao abrir/fechar
  useEffect(() => {
    if (visible) {
      setPhase('preview');
      setError(null);
      setArrived(false);
      setFollowUser(false);
      announcedRef.current.clear();
      if (!userPos && initialOrigin) setUserPos(initialOrigin);
    } else {
      setRoute(null);
      try { Speech.stop(); } catch {}
    }
  }, [visible]);

  useEffect(() => {
    return () => { try { Speech.stop(); } catch {} };
  }, []);

  // ─── GPS watch
  useEffect(() => {
    if (!visible) return;
    let canceled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!canceled) setError('Permissão de localização negada');
          return;
        }

        try {
          const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
          if (last && !canceled && !userPos) {
            setUserPos({ latitude: last.coords.latitude, longitude: last.coords.longitude });
          }
        } catch {}

        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then((pos) => {
            if (canceled) return;
            setUserPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          })
          .catch(() => {});

        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 2,
          },
          (loc) => {
            if (canceled) return;
            const newPos: Coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

            // Usa heading do sensor do dispositivo (bússola) se disponível e confiável
            if (loc.coords.heading != null && loc.coords.heading >= 0) {
              setUserHeading(loc.coords.heading);
            } else {
              // Fallback: calcula pelo deslocamento
              const prev = prevUserPosRef.current;
              if (prev) {
                const moved = haversineMeters(prev, newPos);
                if (moved > 2) setUserHeading(bearingDegrees(prev, newPos));
              }
            }
            prevUserPosRef.current = newPos;
            setUserPos(newPos);
            if (loc.coords.speed != null && loc.coords.speed >= 0) setUserSpeed(loc.coords.speed);
          }
        );
      } catch (e: any) {
        if (!canceled) setError(e?.message ?? 'Erro ao obter localização');
      }
    })();

    return () => {
      canceled = true;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [visible]);

  // ─── Origem inicial estável para Routes API
  const initialRouteOrigin: Coords | null = useMemo(() => {
    if (!userPos) return null;
    const round = (v: number) => Math.round(v * 1000) / 1000;
    return { latitude: round(userPos.latitude), longitude: round(userPos.longitude) };
  }, [
    userPos ? Math.round(userPos.latitude * 1000) : null,
    userPos ? Math.round(userPos.longitude * 1000) : null,
    lastRerouteAtRef.current,
  ]);

  const fetchRoute = async (origin: Coords) => {
    setLoading(true);
    setError(null);
    try {
      const result = await computeRoute(GOOGLE_API_KEY, {
        origin, destination,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      });
      setRoute(result);
      announcedRef.current.clear();
      setLoading(false);
      if (mapRef.current && result.polyline.length > 0) {
        mapRef.current.fitToCoordinates(result.polyline, {
          edgePadding: { top: 100, right: 60, bottom: 220, left: 60 },
          animated: true,
        });
      }
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível calcular a rota');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !initialRouteOrigin || route) return;
    fetchRoute(initialRouteOrigin);
  }, [visible, initialRouteOrigin]);

  // ─── Chegada + re-rota (só ativo durante navegação)
  useEffect(() => {
    if (phase !== 'navigating' || !userPos || !route || arrived) return;

    const distToDest = haversineMeters(userPos, destination);
    if (distToDest < 30) {
      setArrived(true);
      track('navigation_completed');
      if (voiceEnabled) speak('Você chegou ao destino.', true);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      return;
    }

    const distToRoute = distanceToPolyline(userPos, route.polyline);
    const now = Date.now();
    if (distToRoute > OFF_ROUTE_THRESHOLD_M && now - lastRerouteAtRef.current > REROUTE_DEBOUNCE_MS) {
      lastRerouteAtRef.current = now;
      track('route_recalculated', { distFromRouteM: Math.round(distToRoute) });
      if (voiceEnabled) speak('Recalculando rota.', true);
      fetchRoute(userPos);
    }
  }, [userPos, route, arrived, voiceEnabled, phase]);

  // ─── Câmera follow (só na fase navigating)
  useEffect(() => {
    if (phase !== 'navigating' || !followUser || !userPos || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: userPos,
        zoom: 17.5,
        pitch: 55,
        heading: userHeading,
      },
      { duration: 500 }
    );
  }, [userPos, userHeading, followUser, phase]);

  // ─── Step atual
  const curStepIdx = useMemo(() => {
    if (!userPos || !route?.steps?.length) return -1;
    return currentStepIndex(userPos, route.steps);
  }, [userPos, route]);

  const currentStep: RouteStep | null =
    curStepIdx >= 0 && route?.steps ? route.steps[curStepIdx] : null;

  // Próxima manobra após a atual (preview estilo Waze)
  const nextStep: RouteStep | null =
    curStepIdx >= 0 && route?.steps && curStepIdx + 1 < route.steps.length
      ? route.steps[curStepIdx + 1]
      : null;

  const distToManeuver = useMemo(() => {
    if (!userPos || !currentStep) return null;
    return haversineMeters(userPos, currentStep.endLocation);
  }, [userPos, currentStep]);

  // Urgência visual: manobra <100m fica DESTACADA (cor laranja brilhante)
  const isUrgent = distToManeuver != null && distToManeuver <= 100;

  // ─── TTS adaptativo (só na navigating)
  useEffect(() => {
    if (phase !== 'navigating' || !voiceEnabled || !currentStep || !userPos || arrived) return;
    if (distToManeuver == null) return;

    const stepKey = `${curStepIdx}:${currentStep.instruction.slice(0, 30)}`;
    const speedKmh = userSpeed != null ? userSpeed * 3.6 : null;
    const thresholds = voiceThresholds(speedKmh);

    for (const threshold of thresholds) {
      const k = `${stepKey}:${threshold}`;
      if (distToManeuver <= threshold && !announcedRef.current.has(k)) {
        announcedRef.current.add(k);
        let msg: string;
        if (threshold <= 20)        msg = 'Agora.';
        else if (threshold < 1000)  msg = `Em ${Math.round(distToManeuver)} metros, ${currentStep.instruction.toLowerCase()}.`;
        else                         msg = `Em ${(distToManeuver / 1000).toFixed(1)} quilômetros, ${currentStep.instruction.toLowerCase()}.`;
        speak(msg);
        if (threshold <= 80) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} }
        break;
      }
    }
  }, [phase, distToManeuver, curStepIdx, currentStep, voiceEnabled, userPos, arrived, userSpeed]);

  const remaining = useMemo(() => {
    if (!route?.steps || curStepIdx < 0) {
      return { distance: route?.distanceMeters ?? 0, duration: route?.durationSeconds ?? 0 };
    }
    let d = 0, t = 0;
    for (let i = curStepIdx; i < route.steps.length; i++) {
      d += route.steps[i].distanceMeters;
      t += route.steps[i].durationSeconds;
    }
    return { distance: d, duration: t };
  }, [route, curStepIdx]);

  const progress = useMemo(() => {
    if (!route?.distanceMeters) return 0;
    const done = route.distanceMeters - remaining.distance;
    return Math.max(0, Math.min(1, done / route.distanceMeters));
  }, [route, remaining]);

  const etaClock = useMemo(() => {
    if (!remaining.duration) return null;
    const arrival = new Date(Date.now() + remaining.duration * 1000);
    return `${arrival.getHours().toString().padStart(2, '0')}:${arrival.getMinutes().toString().padStart(2, '0')}`;
  }, [remaining]);

  // ─── Ações
  const startNavigation = () => {
    setPhase('navigating');
    setFollowUser(true);
    track('navigation_started', {
      distanceMeters: route?.distanceMeters,
      durationSeconds: route?.durationSeconds,
      stepsCount: route?.steps.length,
    });
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (voiceEnabled && route?.steps?.[0]) {
      speak(`Iniciando navegação. ${route.steps[0].instruction}`, true);
    }
  };

  const recenterOnUser = () => setFollowUser(true);

  const showFullRoute = () => {
    setFollowUser(false);
    if (route?.polyline?.length && mapRef.current) {
      mapRef.current.fitToCoordinates(route.polyline, {
        edgePadding: { top: 180, right: 60, bottom: 240, left: 60 },
        animated: true,
      });
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled((v) => {
      const next = !v;
      if (!next) { try { Speech.stop(); } catch {} }
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: userPos ? userPos.latitude : destination.latitude,
            longitude: userPos ? userPos.longitude : destination.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={false /* substituímos pelo nosso marker-seta */}
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic
          zoomEnabled
          scrollEnabled
          rotateEnabled
          onPanDrag={() => phase === 'navigating' && setFollowUser(false)}
        >
          {/* MARCADOR DO USUÁRIO — seta rotativa com círculo */}
          {userPos && (
            <Marker
              coordinate={userPos}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={userHeading}
              flat
              tracksViewChanges={false}
              zIndex={100}
            >
              <View style={styles.arrowMarker}>
                {/* Sombra/halo externo */}
                <View style={styles.arrowHalo} />
                {/* Círculo principal */}
                <View style={styles.arrowCircle}>
                  {/* Triângulo (seta) apontando para cima */}
                  <View style={styles.arrowTriangle} />
                </View>
              </View>
            </Marker>
          )}

          {/* MARCADOR DESTINO */}
          <Marker
            coordinate={destination}
            title={destinationLabel}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.destMarker}>
              <Text style={styles.destEmoji}>{destinationEmoji}</Text>
            </View>
          </Marker>

          {/* ROTA */}
          {route && route.polyline.length > 0 && (
            <Polyline
              coordinates={route.polyline}
              strokeWidth={7}
              strokeColor="#FF5722"
              geodesic
            />
          )}
        </MapView>

        {/* TOP BAR — varia por fase */}
        {phase === 'navigating' ? (
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                <Text style={styles.iconBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.iconBtn} onPress={toggleVoice}>
                <Text style={styles.iconBtnText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
              </TouchableOpacity>
            </View>

            {arrived ? (
              <View style={styles.arrivedBlock}>
                <Text style={styles.arrivedTitle}>🏁 {t('arrived') || 'Você chegou!'}</Text>
                <Text style={styles.headerSub} numberOfLines={1}>{destinationLabel}</Text>
              </View>
            ) : currentStep ? (
              <View style={styles.instructionBlock}>
                <View style={styles.maneuverRow}>
                  <Text style={[styles.bigManeuver, isUrgent && styles.bigManeuverUrgent]}>
                    {maneuverIcon(currentStep.maneuver)}
                  </Text>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.bigDistance, isUrgent && styles.bigDistanceUrgent]}>
                      {distToManeuver != null ? formatDistanceMeters(distToManeuver) : '—'}
                    </Text>
                    <Text style={styles.instructionText} numberOfLines={2}>
                      {currentStep.instruction || '—'}
                    </Text>
                  </View>
                </View>

                {/* Preview próxima manobra (estilo Waze) */}
                {nextStep ? (
                  <View style={styles.nextStepRow}>
                    <Text style={styles.nextStepLabel}>EM SEGUIDA</Text>
                    <Text style={styles.nextStepIcon}>{maneuverIcon(nextStep.maneuver)}</Text>
                    <Text style={styles.nextStepText} numberOfLines={1}>
                      {nextStep.instruction || '—'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {route && !arrived && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
              </View>
            )}
          </View>
        ) : (
          /* PREVIEW MODE — header simples */
          <View style={[styles.previewTopBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.previewClose} onPress={onClose}>
              <Text style={styles.previewCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.previewTitleBlock}>
              <Text style={styles.previewLabel}>DESTINO</Text>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {destinationEmoji} {destinationLabel}
              </Text>
            </View>
          </View>
        )}

        {/* FAB direita */}
        {phase === 'navigating' && (
          <View style={[styles.fab, { bottom: insets.bottom + 180 }]}>
            <TouchableOpacity
              style={[styles.fabBtn, followUser && styles.fabBtnActive]}
              onPress={recenterOnUser}
              activeOpacity={0.7}
            >
              <Text style={styles.fabIcon}>📍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fabBtn, { marginTop: 10 }]} onPress={showFullRoute} activeOpacity={0.7}>
              <Text style={styles.fabIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabBtn, { marginTop: 10 }, showStepsList && styles.fabBtnActive]}
              onPress={() => setShowStepsList((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.fabIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Velocímetro (só navigating) */}
        {phase === 'navigating' && userSpeed != null && (
          <View style={[styles.speedometer, { bottom: insets.bottom + 180 }]}>
            <Text style={styles.speedValue}>{Math.round(userSpeed * 3.6)}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}

        {/* Lista de passos */}
        {phase === 'navigating' && showStepsList && route?.steps && (
          <View style={[styles.stepsPanel, { top: insets.top + 230, bottom: insets.bottom + 180 }]}>
            <View style={styles.stepsPanelHeader}>
              <Text style={styles.stepsTitle}>📋 {t('steps') || 'Próximos passos'}</Text>
              <TouchableOpacity
                style={styles.stepsCloseBtn}
                onPress={() => setShowStepsList(false)}
                hitSlop={10}
              >
                <Text style={styles.stepsCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {route.steps.slice(Math.max(0, curStepIdx)).map((s, idx) => (
                <View key={idx} style={[styles.stepRow, idx === 0 && styles.stepRowCurrent]}>
                  <Text style={styles.stepIcon}>{maneuverIcon(s.maneuver)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepInstr} numberOfLines={2}>{s.instruction || '—'}</Text>
                    <Text style={styles.stepMeta}>
                      {formatDistanceMeters(s.distanceMeters)}  •  {formatDurationSeconds(s.durationSeconds)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BOTTOM PANEL */}
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
          {error ? (
            <Text style={styles.errorText}>⚠️ {error}</Text>
          ) : loading && !route ? (
            <View style={styles.loadingRoute}>
              <ActivityIndicator size="small" color="#FF5722" />
              <Text style={styles.loadingRouteText}>{t('calculating_route') || 'Calculando rota…'}</Text>
            </View>
          ) : route ? (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDistanceMeters(remaining.distance)}</Text>
                <Text style={styles.statLabel}>{t('distance') || 'Distância'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDurationSeconds(remaining.duration)}</Text>
                <Text style={styles.statLabel}>{t('eta') || 'Tempo'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{etaClock ?? '—'}</Text>
                <Text style={styles.statLabel}>{t('arrival_time') || 'Chegada'}</Text>
              </View>
            </View>
          ) : null}

          {/* CTA — varia por fase */}
          {phase === 'preview' && route && !error && (
            <View style={styles.previewCtaRow}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }]}
                onPress={onClose}
              >
                <Text style={styles.cancelBtnText}>{t('cancel') || 'Cancelar'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
                onPress={startNavigation}
              >
                <Text style={styles.startBtnText}>🧭 {t('start_navigation') || 'Iniciar navegação'}</Text>
              </Pressable>
            </View>
          )}

          {phase === 'navigating' && arrived && (
            <Pressable
              style={({ pressed }) => [styles.startBtn, { marginTop: 10 }, pressed && { opacity: 0.85 }]}
              onPress={onClose}
            >
              <Text style={styles.startBtnText}>✓ {t('finish') || 'Concluir'}</Text>
            </Pressable>
          )}

          {phase === 'navigating' && !arrived && (
            <Pressable
              style={({ pressed }) => [styles.cancelNavBtn, pressed && { opacity: 0.7 }]}
              onPress={() => { setPhase('preview'); setFollowUser(false); try { Speech.stop(); } catch {} }}
            >
              <Text style={styles.cancelNavBtnText}>✕ {t('cancel_navigation') || 'Cancelar navegação'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function formatDistanceMeters(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatDurationSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rem = min - h * 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // ─── SETA do usuário (substitui o blue dot)
  arrowMarker: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowHalo: {
    position: 'absolute',
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.22)', // azul translúcido
  },
  arrowCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2563EB',       // azul Google Maps
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  arrowTriangle: {
    width: 0, height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    marginTop: -3, // centraliza verticalmente dentro do círculo
  },

  // ─── Navigating top bar (escuro)
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  instructionBlock: { paddingHorizontal: 4, paddingVertical: 6 },
  maneuverRow: { flexDirection: 'row', alignItems: 'center' },
  bigManeuver: { fontSize: 60, lineHeight: 64, includeFontPadding: false },
  bigDistance: { fontSize: 34, fontWeight: '900', color: '#FF7043', includeFontPadding: false, lineHeight: 36 },
  instructionText: { fontSize: 15, fontWeight: '600', color: '#fff', lineHeight: 19, includeFontPadding: false, marginTop: 2 },

  arrivedBlock: { paddingHorizontal: 4, paddingVertical: 12 },
  arrivedTitle: { fontSize: 26, fontWeight: '900', color: '#22C55E', marginBottom: 4 },
  headerSub: { fontSize: 17, color: '#fff', fontWeight: '800', marginTop: 4 },

  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#FF5722' },

  // ─── Preview top bar (claro/translúcido)
  previewTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
  previewClose: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  previewCloseText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  previewTitleBlock: { flex: 1, marginLeft: 12 },
  previewLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', letterSpacing: 0.5 },
  previewTitle: { fontSize: 16, color: '#0F172A', fontWeight: '800', marginTop: 1 },

  // ─── Destino
  destMarker: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#fff',
    borderWidth: 3, borderColor: '#FF5722',
    alignItems: 'center', justifyContent: 'center',
    elevation: 10,
  },
  destEmoji: { fontSize: 22 },

  // ─── FAB
  fab: { position: 'absolute', right: 14, alignItems: 'center' },
  fabBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabBtnActive: { backgroundColor: '#FF5722' },
  fabIcon: { fontSize: 22 },

  // ─── Velocímetro
  speedometer: {
    position: 'absolute', left: 14,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#1E293B',
    elevation: 8,
  },
  speedValue: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', includeFontPadding: false, lineHeight: 24 },
  speedUnit: { fontSize: 9, color: '#64748B', fontWeight: '700', marginTop: -1 },

  // ─── Steps panel
  stepsPanel: {
    position: 'absolute', left: 14, right: 14,
    backgroundColor: '#fff',
    borderRadius: 14, padding: 12, elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  stepsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepsTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  stepsCloseBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepsCloseBtnText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepRowCurrent: { backgroundColor: '#FFF7ED', borderRadius: 8 },
  stepIcon: { fontSize: 22, marginRight: 10, width: 28, textAlign: 'center' },
  stepInstr: { fontSize: 13, fontWeight: '700', color: '#1F2937', includeFontPadding: false },
  stepMeta: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },

  // ─── Bottom panel
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 14,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    elevation: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18, shadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', includeFontPadding: false },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },

  loadingRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  loadingRouteText: { marginLeft: 10, fontSize: 13, color: '#64748B', fontWeight: '600' },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginVertical: 14, fontWeight: '600' },

  // ─── CTA preview
  previewCtaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#475569', includeFontPadding: false },
  startBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  startBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3, includeFontPadding: false },

  // Próxima manobra (preview Waze)
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  nextStepLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, marginRight: 8 },
  nextStepIcon: { fontSize: 22, marginRight: 8, includeFontPadding: false },
  nextStepText: { flex: 1, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', includeFontPadding: false },

  // Urgência (<100m)
  bigManeuverUrgent: { color: '#FF7043' /* laranja brilhante */ },
  bigDistanceUrgent: { color: '#FFB74D' },

  // Cancelar navegação (volta pro preview)
  cancelNavBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelNavBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B', includeFontPadding: false },
});
