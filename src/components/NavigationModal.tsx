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
  const autoRecenterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [followUser, setFollowUser] = useState(false);
  const [showStepsList, setShowStepsList] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // ─── Posição interpolada (30 fps entre GPS fixes) ────────────────────────
  // Evita o "pulo" de ~10 m a cada 1 segundo de GPS.
  const [markerPos, setMarkerPos] = useState<Coords | null>(initialOrigin);
  const interpFromRef  = useRef<Coords | null>(null);
  const interpTargetRef = useRef<Coords | null>(null);
  const interpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rota percorrida (para colorir em azul mais claro)
  const [traveledPolyline, setTraveledPolyline] = useState<Coords[]>([]);
  const traveledRef = useRef<Coords[]>([]);

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

  // ─── Interpolação suave entre GPS fixes (30 fps) ──────────────────────────
  useEffect(() => {
    if (!userPos) return;

    const target = userPos;
    const from   = interpFromRef.current ?? target;
    const t0     = Date.now();
    // Interpola em 850 ms (ligeiramente abaixo do intervalo de 1 s do GPS)
    const DURATION = 850;

    if (interpTimerRef.current) clearInterval(interpTimerRef.current);

    interpTimerRef.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / DURATION);
      const lat = from.latitude  + (target.latitude  - from.latitude)  * t;
      const lon = from.longitude + (target.longitude - from.longitude) * t;
      const pos: Coords = { latitude: lat, longitude: lon };
      setMarkerPos({ ...pos });

      if (t >= 1) {
        interpFromRef.current = target;
        clearInterval(interpTimerRef.current!);
        // Acrescenta ponto à rota percorrida
        traveledRef.current = [...traveledRef.current, target];
        if (traveledRef.current.length > 500) traveledRef.current.shift(); // limite memória
        setTraveledPolyline([...traveledRef.current]);
      }
    }, 33); // ~30 fps

    return () => { if (interpTimerRef.current) clearInterval(interpTimerRef.current); };
  }, [userPos]);

  // Limpa tudo ao fechar
  useEffect(() => {
    if (!visible) {
      if (interpTimerRef.current) clearInterval(interpTimerRef.current);
      traveledRef.current = [];
      setTraveledPolyline([]);
      interpFromRef.current  = null;
      interpTargetRef.current = null;
    }
  }, [visible]);

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

  // ─── Câmera follow — 200ms, usa posição interpolada para suavidade máxima
  useEffect(() => {
    if (phase !== 'navigating' || !followUser || !markerPos || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: markerPos,
        zoom: 17.5,
        pitch: 55,
        heading: userHeading,
      },
      { duration: 200 }
    );
  }, [markerPos, userHeading, followUser, phase]);

  // ─── Limpar timer de auto-recentrar ao desmontar
  useEffect(() => {
    return () => {
      if (autoRecenterTimerRef.current) clearTimeout(autoRecenterTimerRef.current);
    };
  }, []);

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
          onPanDrag={() => {
            if (phase === 'navigating') {
              setFollowUser(false);
              // Auto-recentrar após 5 segundos sem arrastar
              if (autoRecenterTimerRef.current) clearTimeout(autoRecenterTimerRef.current);
              autoRecenterTimerRef.current = setTimeout(() => setFollowUser(true), 5000);
            }
          }}
        >
          {/* MARCADOR DO USUÁRIO — seta de navegação com interpolação */}
          {markerPos && (
            <Marker
              coordinate={markerPos}
              anchor={{ x: 0.5, y: 0.6 }}
              rotation={userHeading}
              flat
              tracksViewChanges   // sempre atualiza view (heading + pos)
              zIndex={200}
            >
              <View style={styles.arrowMarker}>
                {/* Halo de precisão pulsante */}
                <View style={styles.arrowHalo} />
                {/* Sombra-cone de direção */}
                <View style={styles.arrowBeam} />
                {/* Corpo principal da seta — chevron */}
                <View style={styles.arrowBody}>
                  {/* Ponta da seta (triângulo) */}
                  <View style={styles.arrowTip} />
                  {/* Base circular */}
                  <View style={styles.arrowBase} />
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

          {/* ROTA — ainda não percorrida (azul) */}
          {route && route.polyline.length > 0 && (
            <Polyline
              coordinates={route.polyline}
              strokeWidth={9}
              strokeColor="#1A73E8"
              geodesic
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* ROTA — borda branca para dar profundidade */}
          {route && route.polyline.length > 0 && (
            <Polyline
              coordinates={route.polyline}
              strokeWidth={13}
              strokeColor="rgba(255,255,255,0.55)"
              geodesic
              zIndex={1}
            />
          )}

          {/* ROTA — azul por cima da borda */}
          {route && route.polyline.length > 0 && (
            <Polyline
              coordinates={route.polyline}
              strokeWidth={9}
              strokeColor="#1A73E8"
              geodesic
              zIndex={2}
              lineCap="round"
            />
          )}

          {/* ROTA PERCORRIDA — cinza opaco por cima */}
          {traveledPolyline.length > 1 && (
            <Polyline
              coordinates={traveledPolyline}
              strokeWidth={9}
              strokeColor="rgba(150,160,175,0.85)"
              geodesic
              zIndex={3}
              lineCap="round"
            />
          )}
        </MapView>

        {/* ═══════════════════════ TOP BAR ═══════════════════════ */}
        {phase === 'navigating' ? (
          arrived ? (
            /* ARRIVED */
            <View style={[styles.gmTopBar, { paddingTop: insets.top + 10 }]}>
              <View style={styles.gmInstrRow}>
                <View style={styles.gmTurnBox}>
                  <Text style={styles.gmTurnIcon}>🏁</Text>
                </View>
                <View style={styles.gmInstrCenter}>
                  <Text style={styles.gmStreet} numberOfLines={1}>{t('arrived') || 'Você chegou!'}</Text>
                  <Text style={styles.gmStreetSub} numberOfLines={1}>{destinationLabel}</Text>
                </View>
              </View>
            </View>
          ) : currentStep ? (
            /* NAVIGATING WITH STEP */
            <View style={[styles.gmTopBar, { paddingTop: insets.top + 10 }]}>
              {/* Linha principal: ícone manobra + distância + rua + botão recentrar */}
              <View style={styles.gmInstrRow}>
                <View style={[styles.gmTurnBox, isUrgent && styles.gmTurnBoxUrgent]}>
                  <Text style={styles.gmTurnIcon}>{maneuverIcon(currentStep.maneuver)}</Text>
                </View>
                <View style={styles.gmInstrCenter}>
                  <Text style={[styles.gmDistance, isUrgent && styles.gmDistanceUrgent]}>
                    {distToManeuver != null ? formatDistanceMeters(distToManeuver) : '—'}
                  </Text>
                  <Text style={styles.gmStreet} numberOfLines={1}>
                    {currentStep.instruction || '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.gmRecenterBtn, followUser && styles.gmRecenterBtnActive]}
                  onPress={recenterOnUser}
                  activeOpacity={0.75}
                >
                  <Text style={styles.gmRecenterIcon}>✦</Text>
                </TouchableOpacity>
              </View>

              {/* Faixa "Depois" — próxima manobra */}
              {nextStep ? (
                <View style={styles.gmNextStrip}>
                  <Text style={styles.gmNextLabel}>Depois,</Text>
                  <Text style={styles.gmNextIcon}>{maneuverIcon(nextStep.maneuver)}</Text>
                  <Text style={styles.gmNextText} numberOfLines={1}>{nextStep.instruction || '—'}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            /* NAVIGATING, NO STEP YET */
            <View style={[styles.gmTopBar, { paddingTop: insets.top + 10 }]}>
              <View style={styles.gmInstrRow}>
                <View style={styles.gmTurnBox}>
                  <Text style={styles.gmTurnIcon}>↑</Text>
                </View>
                <View style={styles.gmInstrCenter}>
                  <Text style={styles.gmDistance}>{destinationLabel}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.gmRecenterBtn, followUser && styles.gmRecenterBtnActive]}
                  onPress={recenterOnUser}
                >
                  <Text style={styles.gmRecenterIcon}>✦</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          /* PREVIEW MODE */
          <View style={[styles.gmPreviewBar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.gmCloseCircle} onPress={onClose}>
              <Text style={styles.gmCloseCircleText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.gmPreviewInfo}>
              <Text style={styles.gmPreviewLabel}>DESTINO</Text>
              <Text style={styles.gmPreviewTitle} numberOfLines={1}>
                {destinationEmoji} {destinationLabel}
              </Text>
              {route && (
                <Text style={styles.gmPreviewMeta}>
                  {formatDurationSeconds(route.durationSeconds)}  ·  {formatDistanceMeters(route.distanceMeters)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ═══════════════════ FABs — LADO DIREITO ═══════════════════ */}
        {phase === 'navigating' && (
          <View style={[styles.gmFabCol, { bottom: insets.bottom + GM_BOTTOM_H + 16 }]}>
            <TouchableOpacity style={styles.gmFab} onPress={toggleVoice} activeOpacity={0.75}>
              <Text style={styles.gmFabText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gmFab, { marginTop: 10 }, showStepsList && styles.gmFabActive]}
              onPress={() => setShowStepsList((v) => !v)}
              activeOpacity={0.75}
            >
              <Text style={styles.gmFabText}>≡</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════ VELOCÍMETRO ═══════════════════ */}
        {phase === 'navigating' && userSpeed != null && (
          <View style={[styles.gmSpeedometer, { bottom: insets.bottom + GM_BOTTOM_H + 16 }]}>
            <Text style={styles.gmSpeedValue}>{Math.round(userSpeed * 3.6)}</Text>
            <Text style={styles.gmSpeedUnit}>km/h</Text>
          </View>
        )}

        {/* ═══════════════════ PILL RECENTRALIZAR ═══════════════════ */}
        {phase === 'navigating' && !followUser && (
          <TouchableOpacity
            style={[styles.gmRecenterPill, { bottom: insets.bottom + GM_BOTTOM_H + 16 }]}
            onPress={recenterOnUser}
            activeOpacity={0.8}
          >
            <Text style={styles.gmRecenterPillText}>⟳  Recentralizar</Text>
          </TouchableOpacity>
        )}

        {/* ═══════════════════ LISTA DE PASSOS ═══════════════════ */}
        {phase === 'navigating' && showStepsList && route?.steps && (
          <View style={[styles.stepsPanel, { bottom: insets.bottom + GM_BOTTOM_H + 12 }]}>
            <View style={styles.stepsPanelHeader}>
              <Text style={styles.stepsTitle}>Próximos passos</Text>
              <TouchableOpacity
                style={styles.stepsCloseBtn}
                onPress={() => setShowStepsList(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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

        {/* ═══════════════════ BOTTOM BAR (Google Maps) ═══════════════════ */}
        <View style={[styles.gmBottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {error ? (
            <View style={styles.gmBottomError}>
              <Text style={styles.gmBottomErrorText}>⚠️ {error}</Text>
            </View>
          ) : loading && !route ? (
            <View style={styles.gmBottomLoading}>
              <ActivityIndicator size="small" color="#1A73E8" />
              <Text style={styles.gmBottomLoadingText}>Calculando rota…</Text>
            </View>
          ) : route ? (
            phase === 'preview' ? (
              /* PREVIEW BOTTOM: info + CTA */
              <>
                <View style={styles.gmPreviewCtaRow}>
                  <Pressable style={({ pressed }) => [styles.gmCancelBtn, pressed && { opacity: 0.7 }]} onPress={onClose}>
                    <Text style={styles.gmCancelBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.gmStartBtn, pressed && { opacity: 0.88 }]} onPress={startNavigation}>
                    <Text style={styles.gmStartBtnText}>▶  Iniciar</Text>
                  </Pressable>
                </View>
              </>
            ) : arrived ? (
              /* ARRIVED BOTTOM */
              <Pressable style={({ pressed }) => [styles.gmStartBtn, pressed && { opacity: 0.88 }]} onPress={onClose}>
                <Text style={styles.gmStartBtnText}>✓  Concluir</Text>
              </Pressable>
            ) : (
              /* NAVIGATING BOTTOM: X · tempo/dist · ⇅ */
              <View style={styles.gmNavRow}>
                {/* Botão Sair — círculo com ✕ */}
                <TouchableOpacity
                  style={styles.gmExitBtn}
                  onPress={() => { setPhase('preview'); setFollowUser(false); try { Speech.stop(); } catch {} }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.gmExitText}>✕</Text>
                </TouchableOpacity>

                {/* Centro: tempo + distância + ETA */}
                <View style={styles.gmNavCenter}>
                  <View style={styles.gmNavTimeRow}>
                    <Text style={styles.gmNavTime}>{formatDurationSeconds(remaining.duration)}</Text>
                    <Text style={styles.gmNavEcoLeaf}> 🌿</Text>
                  </View>
                  <Text style={styles.gmNavMeta}>
                    {formatDistanceMeters(remaining.distance)}  ·  {etaClock ?? '—'}
                  </Text>
                  {/* Barra de progresso fina */}
                  <View style={styles.gmProgressTrack}>
                    <View style={[styles.gmProgressBar, { width: `${progress * 100}%` }]} />
                  </View>
                </View>

                {/* Botão "ver rota completa" */}
                <TouchableOpacity style={styles.gmRouteOptionsBtn} onPress={showFullRoute} activeOpacity={0.75}>
                  <Text style={styles.gmRouteOptionsText}>⇅</Text>
                </TouchableOpacity>
              </View>
            )
          ) : null}
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

/** Altura fixa do bottom bar no modo navigating */
const GM_BOTTOM_H = 90;

const gmShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.28,
  shadowRadius: 8,
  elevation: 12,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eaed' },

  // ─── Seta de navegação (chevron Google Maps)
  arrowMarker: {
    width: 56, height: 72,
    alignItems: 'center', justifyContent: 'flex-end',
  },
  // Halo de precisão GPS
  arrowHalo: {
    position: 'absolute',
    width: 56, height: 56,
    bottom: 8,
    borderRadius: 28,
    backgroundColor: 'rgba(26,115,232,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(26,115,232,0.35)',
  },
  // Cone de direção (feixe apontando para frente)
  arrowBeam: {
    position: 'absolute',
    bottom: 28,           // nasce do centro do círculo
    width: 0, height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(26,115,232,0.22)',
    transform: [{ rotate: '180deg' }], // aponta para cima (frente)
  },
  // Container do corpo da seta
  arrowBody: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  // Ponta triangular — aponta para cima (frente do veículo)
  arrowTip: {
    width: 0, height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1A73E8',
    // sombra
    elevation: 8,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  // Base circular (traseira do veículo)
  arrowBase: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1A73E8',
    borderWidth: 3, borderColor: '#fff',
    marginTop: -5,          // sobrepõe levemente a ponta
    elevation: 8,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  // ─── Destino marker
  destMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', borderWidth: 3, borderColor: '#1A73E8',
    alignItems: 'center', justifyContent: 'center', elevation: 10,
  },
  destEmoji: { fontSize: 22 },

  // ═══════════════════ TOP BAR — NAVIGATING (Google Maps style) ═══════════════════
  gmTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#1B3A5C',  // navy escuro igual Google Maps
    paddingHorizontal: 0, paddingBottom: 0,
    ...gmShadow,
  },
  gmInstrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingBottom: 10,
  },
  // Caixa do ícone de manobra — destaque à esquerda
  gmTurnBox: {
    width: 72, minHeight: 72,
    backgroundColor: '#1A73E8',   // azul Google
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12,
  },
  gmTurnBoxUrgent: { backgroundColor: '#E84335' }, // vermelho se < 100m
  gmTurnIcon: { fontSize: 36, color: '#fff', includeFontPadding: false },

  gmInstrCenter: { flex: 1, paddingHorizontal: 14, justifyContent: 'center' },
  gmDistance: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    includeFontPadding: false, lineHeight: 34,
  },
  gmDistanceUrgent: { color: '#FFC107' },
  gmStreet: {
    fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)',
    includeFontPadding: false, lineHeight: 18, marginTop: 2,
  },
  gmStreetSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)',
    includeFontPadding: false, marginTop: 2,
  },

  // Botão de recentrar no canto direito da top bar
  gmRecenterBtn: {
    width: 52, height: 52, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 26,
  },
  gmRecenterBtnActive: { backgroundColor: 'rgba(26,115,232,0.25)' },
  gmRecenterIcon: { fontSize: 26, color: '#fff' },

  // Faixa "Depois" (próxima manobra)
  gmNextStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#14304E',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  gmNextLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '700', marginRight: 8 },
  gmNextIcon: { fontSize: 18, color: '#fff', marginRight: 6, includeFontPadding: false },
  gmNextText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', includeFontPadding: false },

  // ═══════════════════ TOP BAR — PREVIEW ═══════════════════
  gmPreviewBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    ...gmShadow,
  },
  gmCloseCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  gmCloseCircleText: { fontSize: 16, fontWeight: '800', color: '#333' },
  gmPreviewInfo: { flex: 1, marginLeft: 12 },
  gmPreviewLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: '700', letterSpacing: 0.5 },
  gmPreviewTitle: { fontSize: 16, color: '#1A1A1A', fontWeight: '800', marginTop: 1 },
  gmPreviewMeta: { fontSize: 13, color: '#1A73E8', fontWeight: '700', marginTop: 3 },

  // ═══════════════════ FABs DIREITA ═══════════════════
  gmFabCol: { position: 'absolute', right: 14, alignItems: 'center' },
  gmFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 4,
  },
  gmFabActive: { backgroundColor: '#E8F0FE' },
  gmFabText: { fontSize: 20 },

  // ═══════════════════ VELOCÍMETRO ═══════════════════
  gmSpeedometer: {
    position: 'absolute', left: 14,
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#1B3A5C',
    elevation: 8,
  },
  gmSpeedValue: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', includeFontPadding: false, lineHeight: 24 },
  gmSpeedUnit: { fontSize: 9, color: '#9E9E9E', fontWeight: '700', marginTop: -1 },

  // ═══════════════════ PILL RECENTRALIZAR ═══════════════════
  gmRecenterPill: {
    position: 'absolute', left: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  gmRecenterPillText: { fontSize: 13, fontWeight: '700', color: '#1A73E8' },

  // ═══════════════════ LISTA DE PASSOS ═══════════════════
  stepsPanel: {
    position: 'absolute', left: 14, right: 14, top: 200,
    backgroundColor: '#fff',
    borderRadius: 14, padding: 12, elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
    maxHeight: 300,
  },
  stepsPanelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  stepsTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  stepsCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  stepsCloseBtnText: { fontSize: 15, fontWeight: '900', color: '#475569' },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepRowCurrent: { backgroundColor: '#E8F0FE', borderRadius: 8 },
  stepIcon: { fontSize: 20, marginRight: 10, width: 26, textAlign: 'center' },
  stepInstr: { fontSize: 13, fontWeight: '700', color: '#1F2937', includeFontPadding: false },
  stepMeta: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },

  // ═══════════════════ BOTTOM BAR ═══════════════════
  gmBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 14,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  gmBottomLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  gmBottomLoadingText: { marginLeft: 10, fontSize: 14, color: '#555', fontWeight: '600' },
  gmBottomError: { paddingVertical: 14, alignItems: 'center' },
  gmBottomErrorText: { fontSize: 14, color: '#D32F2F', fontWeight: '600' },

  // Preview bottom CTA
  gmPreviewCtaRow: { flexDirection: 'row', gap: 10 },
  gmCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 24,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  gmCancelBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  gmStartBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 24,
    backgroundColor: '#1A73E8', alignItems: 'center',
    elevation: 4, shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 6,
  },
  gmStartBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  // Navigating bottom row (X · tempo · ⇅)
  gmNavRow: { flexDirection: 'row', alignItems: 'center' },
  gmExitBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#BDBDBD',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  gmExitText: { fontSize: 16, fontWeight: '800', color: '#555' },
  gmNavCenter: { flex: 1 },
  gmNavTimeRow: { flexDirection: 'row', alignItems: 'baseline' },
  gmNavTime: { fontSize: 28, fontWeight: '900', color: '#E53935', includeFontPadding: false },
  gmNavEcoLeaf: { fontSize: 18 },
  gmNavMeta: { fontSize: 13, color: '#757575', fontWeight: '500', marginTop: 1 },
  gmProgressTrack: {
    height: 3, backgroundColor: '#E0E0E0', borderRadius: 2,
    marginTop: 6, overflow: 'hidden',
  },
  gmProgressBar: { height: '100%', backgroundColor: '#1A73E8', borderRadius: 2 },
  gmRouteOptionsBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center', marginLeft: 16,
  },
  gmRouteOptionsText: { fontSize: 20, fontWeight: '700', color: '#333' },
});
