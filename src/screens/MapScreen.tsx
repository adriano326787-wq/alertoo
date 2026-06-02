import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, ActivityIndicator, useColorScheme, Animated, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Usando MapView nativo com clusteringEnabled (suporte oficial ao New Architecture)
// react-native-map-clustering wrappeia o MapView nativo e quebra o bitmap capture no Fabric
import MapView, { Marker, MapPressEvent, PROVIDER_GOOGLE, Region, Heatmap } from 'react-native-maps';
// react-native-maps@1.20+ suporta clusteringEnabled / renderCluster nativamente mas
// os tipos @types/react-native-maps ainda não declaram essas props → cast para any.
// #32 — rastrear upstream: https://github.com/react-native-maps/react-native-maps/issues
// Quando os tipos forem atualizados, remover o cast e usar MapView diretamente.
const ClusteredMapView = MapView as any;
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useEventsStore } from '../store/eventsStore';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { useUserStore } from '../store/userStore';
import { EventMarker } from '../components/EventMarker';
import { EntertainmentMarker } from '../components/EntertainmentMarker';
import { AddEventModal } from '../components/AddEventModal';
import { AddEntertainmentModal } from '../components/AddEntertainmentModal';
import { EventTypePicker } from '../components/EventTypePicker';
import { FilterModal } from '../components/FilterModal';
import { CommentsModal } from '../components/CommentsModal';
import { RoadEventInfoModal } from '../components/RoadEventInfoModal';
import { EntertainmentInfoModal } from '../components/EntertainmentInfoModal';
import { RoadEvent } from '../types';
import { EntertainmentEvent } from '../types/entertainment';
import { haversineDistance } from '../utils/geo';
import { resolveStateUF } from '../utils/brazilGeo';
import { useAppStore, restorePersistedLocation } from '../store/appStore';
import { t } from '../utils/i18n';
import { useT } from '../hooks/useT';
import { getCurrentUser, getCurrentUserId } from '../services/authService';
import { AdBanner } from '../components/AdBanner';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import {
  ZoomTier,
  getZoomTier,
  filterRoadEvents,
  filterEntEvents,
} from '../utils/mapZoom';
import { requestNotificationPermission } from '../services/notificationService';
import { mapStyleLight, mapStyleDark } from '../theme/mapStyle';
import { MapSearchBar, SearchResult } from '../components/ui/MapSearchBar';
import { ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { EVENT_CATEGORIES } from '../types';
import { MapIntroModal, shouldShowMapIntro } from '../components/MapIntroModal';
import { DriverModeOverlay } from '../components/DriverModeOverlay';
import { SavedRouteModal } from '../components/SavedRouteModal';

const MAX_REPORT_RADIUS_KM = 1;

// ─── Detecção de área de água ──────────────────────────────────────────────────
// Termos que identificam corpos d'água com segurança, sem falsos positivos em
// nomes de cidades/bairros brasileiros (ex: "Rio de Janeiro" não é detectado).
const WATER_TERMS = [
  // Português
  'oceano', 'atlântico', 'pacífico', 'pacifico', 'índico', 'indico',
  'golfo', 'baía ', 'baia ', 'enseada', 'lagoa', 'represa', 'reservatório',
  'reservatorio',
  // Inglês / internacional
  'ocean', 'atlantic', 'pacific', 'indian ocean', 'gulf', 'bay of', 'lagoon',
  'reservoir', 'caribbean', 'caribe',
];

/**
 * Verifica se uma coordenada está sobre água (oceano, baía, represa, lagoa).
 * Usa reverseGeocodeAsync no ponto tocado. Falha de forma "aberta" — em caso
 * de erro ou timeout retorna false para não bloquear o usuário.
 */
async function checkIsWaterArea(latitude: number, longitude: number): Promise<boolean> {
  try {
    const result = await Promise.race([
      Location.reverseGeocodeAsync({ latitude, longitude }),
      // Timeout de 4 s para não travar o UX
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);

    // Timeout → we cannot verify; return a sentinel to let the caller show a confirm dialog
    // Use null to distinguish "definitely not water" (false) from "couldn't check" (null)
    if (!result) return false; // fail-open: allow tap but caller may optionally warn

    const places = result as Location.LocationGeocodedAddress[];

    // Sem resultados → posição em oceano aberto (sem endereço)
    if (places.length === 0) return true;

    const p = places[0];

    // Sem país → oceano aberto
    if (!p.country && !p.isoCountryCode) return true;

    // Verificar palavras-chave em todos os campos textuais disponíveis
    const haystack = [
      p.name, p.formattedAddress, p.district, p.subregion, p.city, p.region,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (WATER_TERMS.some((term) => haystack.includes(term))) return true;

    return false;
  } catch {
    return false; // erro → fail open
  }
}

// #6 — Posição padrão (São Paulo). Substituída por posição persistida no useEffect.
const DEFAULT_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Configuração de cluster por tier ────────────────────────────────────────
const CLUSTER_CONFIG: Record<ZoomTier, { radius: number; minPoints: number }> = {
  distant: { radius: 55, minPoints: 5 },  // visão macro: só agrupa grupos grandes
  medium:  { radius: 35, minPoints: 4 },  // bairro: agrupa moderadamente
  close:   { radius: 18, minPoints: 3 },  // rua: mostra mais pins individuais
};

// ─── Aparência do cluster por tier ────────────────────────────────────────────
const CLUSTER_STYLE: Record<ZoomTier, { bg: string; border: string; text: string }> = {
  distant: { bg: '#6366F1', border: '#4F46E5', text: '#fff' }, // roxo — visão ampla
  medium:  { bg: '#0EA5E9', border: '#0284C7', text: '#fff' }, // azul — bairro
  close:   { bg: '#FF5722', border: '#E64A19', text: '#fff' }, // laranja — rua
};

// ─── Tamanho do cluster por quantidade ───────────────────────────────────────
function clusterSize(count: number): number {
  if (count >= 50) return 72;
  if (count >= 20) return 62;
  if (count >= 10) return 54;
  if (count >= 5)  return 48;
  return 42;
}

function clusterLabel(count: number): string {
  if (count >= 999) return '999+';
  if (count >= 99)  return '99+';
  return String(count);
}

// ─── Cluster inteligente ──────────────────────────────────────────────────────
interface SmartClusterProps {
  cluster: any;
  zoomTier: ZoomTier;
  onPress: (cluster: any) => void;
}

// Cluster estilo Google Maps premium — halo translúcido + corpo sólido
function SmartCluster({ cluster, zoomTier, onPress }: SmartClusterProps) {
  // #25 — defensive fallback: point_count may be missing on some implementations
  const count: number = cluster.properties?.point_count ?? 0;
  const [lon, lat] = cluster.geometry.coordinates;
  const size = clusterSize(count);
  const fontSize = size >= 62 ? 18 : size >= 48 ? 16 : 14;

  // tracksViewChanges: inicia true, vira false após 500ms para garantir
  // que o Fabric (New Architecture) capture o bitmap completo antes de congelar
  const [tracks, setTracks] = React.useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={tracks}
    >
      <View
        collapsable={false}
        style={{ alignItems: 'center', justifyContent: 'center', width: size + 16, height: size + 16, overflow: 'hidden' }}
      >
        {/* Halo translúcido externo (estilo Google Maps cluster) */}
        <View
          collapsable={false}
          style={{
            position: 'absolute',
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor: 'rgba(255,107,53,0.18)',
          }}
        />
        {/* Corpo sólido */}
        <View
          collapsable={false}
          style={[clusterStyles.body, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text style={[clusterStyles.count, { fontSize }]}>
            {clusterLabel(count)}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

const clusterStyles = StyleSheet.create({
  body: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    // Sem elevation/shadow: no Android, elevation desloca o bitmap do marker
  },
  count: { fontWeight: '900', color: '#ffffff', includeFontPadding: false, letterSpacing: 0.3 },
});

// ─── Tela ─────────────────────────────────────────────────────────────────────
interface PendingCoord {
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
}

export function MapScreen() {
  const t = useT();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // AdMob — interstitial após criar evento
  const { showAfterEvent } = useInterstitialAd();
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // UI state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [roadModalVisible, setRoadModalVisible] = useState(false);
  const [entertainmentModalVisible, setEntertainmentModalVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [showMapHint, setShowMapHint] = useState(false);
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const [showIntro, setShowIntro] = useState(false);
  const [driverModeActive, setDriverModeActive] = useState(false);
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [savedRouteVisible, setSavedRouteVisible] = useState(false);
  // Endereço selecionado na busca — exibe pin no mapa e card de navegação
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  // Banner "sem conexão" — delay de 3s para evitar falso-positivo no startup
  // (Firestore sempre dispara fromCache=true antes de sincronizar com o servidor)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // #5 — searchBar fade-in when mapReady
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  const [commentTarget, setCommentTarget] = useState<EntertainmentEvent | null>(null);
  const [pendingCoord, setPendingCoord] = useState<PendingCoord | null>(null);
  const [selectedRoadEvent, setSelectedRoadEvent] = useState<RoadEvent | null>(null);
  const [selectedEntEvent, setSelectedEntEvent] = useState<EntertainmentEvent | null>(null);
  const { top: topInset } = useSafeAreaInsets();

  // #6 — região inicial: tenta posição persistida, cai para São Paulo
  const [initialRegion, setInitialRegion] = useState(DEFAULT_REGION);
  useEffect(() => {
    restorePersistedLocation().then((saved) => {
      if (saved) {
        setInitialRegion({
          latitude: saved.lat,
          longitude: saved.lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    }).catch((e) => {
      // #28 — loga falha ao restaurar posição em dev (ex: AsyncStorage corrompido)
      if (__DEV__) console.warn('[MapScreen] restorePersistedLocation failed:', e);
    });
  }, []);

  // Zoom inteligente
  const [zoomTier, setZoomTier] = useState<ZoomTier>(
    () => getZoomTier(DEFAULT_REGION.latitudeDelta)
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mantém o delta atual do mapa para zoom adaptativo no cluster press (item 7)
  const currentDeltaRef = useRef(DEFAULT_REGION.latitudeDelta);

  const handleRegionChange = useCallback((region: Region) => {
    currentDeltaRef.current = region.latitudeDelta; // item 7: mantém delta atual
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setZoomTier((prev) => {
        const next = getZoomTier(region.latitudeDelta);
        return next !== prev ? next : prev;
      });
    }, 120);
  }, []);

  // Quando o cluster é pressionado: dá zoom adaptativo baseado no delta atual (item 7)
  const handleClusterPress = useCallback((cluster: any) => {
    if (!mapRef.current) return;
    const [lon, lat] = cluster.geometry.coordinates;
    // Divide o delta atual por 3 — garante zoom in independente do nível atual
    const delta = Math.max(currentDeltaRef.current / 3, 0.002);
    mapRef.current.animateToRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }, 500);
  }, []);

  // Stores
  const { loading: roadLoading, events: allRoadEvents, subscribeToEvents, confirmEvent, denyEvent, filterStateUF, isFromCache: roadFromCache } = useEventsStore();
  const { events: entertainmentEvents, subscribe: subscribeEntertainment, toggleLike, isFromCache: entFromCache } = useEntertainmentStore();
  const isOffline = roadFromCache || entFromCache;
  const isAdmin = useUserStore((s) => s.isAdmin);
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF = useAppStore((s) => s.setUserStateUF);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const pendingMapFocus = useAppStore((s) => s.pendingMapFocus);
  const clearMapFocus = useAppStore((s) => s.clearMapFocus);
  const pendingDeepLink = useAppStore((s) => s.pendingDeepLink);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

  // Pins filtrados por tier — memoizados para não recalcular a cada re-render do mapa
  const roadEvents = useMemo(() => filterRoadEvents(allRoadEvents, zoomTier), [allRoadEvents, zoomTier]);
  const visibleEntEvents = useMemo(() => filterEntEvents(entertainmentEvents, zoomTier), [entertainmentEvents, zoomTier]);

  // Lista para a SearchBar — usa allRoadEvents (não filtrado por zoom) para busca completa (#9)
  const localSearchEvents = useMemo(() => [
    ...entertainmentEvents.map((e) => ({
      id: e.id, title: e.title,
      category: e.category, cityName: e.cityName, stateUF: e.stateUF,
      latitude: e.latitude, longitude: e.longitude,
      emoji: ENTERTAINMENT_CATEGORIES[e.category]?.emoji,
      type: 'entertainment' as const,
    })),
    ...allRoadEvents.map((e) => ({
      id: e.id, title: e.title,
      category: e.category, cityName: e.cityName, stateUF: e.stateUF,
      latitude: e.latitude, longitude: e.longitude,
      emoji: EVENT_CATEGORIES[e.category]?.emoji,
      type: 'road' as const,
    })),
  ], [entertainmentEvents, allRoadEvents]);

  // #35 — memoize cluster config to avoid creating new object reference every render
  const { radius, minPoints } = useMemo(() => CLUSTER_CONFIG[zoomTier], [zoomTier]);

  useEffect(() => {
    if (!pendingMapFocus || !mapReady || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: pendingMapFocus.lat,
      longitude: pendingMapFocus.lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 800);
    clearMapFocus();
  }, [pendingMapFocus, mapReady]);

  // ─── Deep link → abrir evento ──────────────────────────────────────────────
  // Aguarda os stores carregarem o evento (pode chegar antes ou depois do link).
  // Timeout de 12s: se o evento não aparecer (expirado/deletado), descarta o link
  // e avisa o usuário (item #6).
  const deepLinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entLoading = useEntertainmentStore((s) => s.loading);

  useEffect(() => {
    // #23 — don't start deep link timeout while stores are loading initial data
    if (!pendingDeepLink || !mapReady || roadLoading || entLoading) return;

    const { type, id } = pendingDeepLink;

    const tryOpen = () => {
      if (type === 'road') {
        const ev = allRoadEvents.find((e) => e.id === id);
        if (ev) {
          setSelectedRoadEvent(ev);
          mapRef.current?.animateToRegion({ latitude: ev.latitude, longitude: ev.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800);
          setPendingDeepLink(null);
          if (deepLinkTimeoutRef.current) clearTimeout(deepLinkTimeoutRef.current);
          return true;
        }
      } else if (type === 'entertainment') {
        const ev = entertainmentEvents.find((e) => e.id === id);
        if (ev) {
          setSelectedEntEvent(ev);
          mapRef.current?.animateToRegion({ latitude: ev.latitude, longitude: ev.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800);
          setPendingDeepLink(null);
          if (deepLinkTimeoutRef.current) clearTimeout(deepLinkTimeoutRef.current);
          return true;
        }
      }
      return false;
    };

    if (!tryOpen()) {
      // Evento não encontrado ainda — inicia timeout de fallback
      if (!deepLinkTimeoutRef.current) {
        deepLinkTimeoutRef.current = setTimeout(() => {
          deepLinkTimeoutRef.current = null;
          setPendingDeepLink(null);
          Alert.alert(t('event_not_found_title'), t('event_not_found_msg'));
        }, 12_000);
      }
    }

    return () => {
      if (deepLinkTimeoutRef.current) { clearTimeout(deepLinkTimeoutRef.current); deepLinkTimeoutRef.current = null; }
    };
  }, [pendingDeepLink, mapReady, allRoadEvents, entertainmentEvents, roadLoading, entLoading]);

  // Delay de 3s no banner offline para evitar falso-positivo durante sync inicial do Firestore
  useEffect(() => {
    if (isOffline && !roadLoading) {
      offlineTimerRef.current = setTimeout(() => setShowOfflineBanner(true), 3000);
    } else {
      if (offlineTimerRef.current) { clearTimeout(offlineTimerRef.current); offlineTimerRef.current = null; }
      setShowOfflineBanner(false);
    }
    return () => { if (offlineTimerRef.current) { clearTimeout(offlineTimerRef.current); offlineTimerRef.current = null; } };
  }, [isOffline, roadLoading]);

  useEffect(() => {
    const unsubRoad = subscribeToEvents();
    const unsubEnt = subscribeEntertainment();
    centerOnUser();
    // Solicita permissão de notificação no contexto do mapa (item #4)
    // Feito aqui pois é o momento mais natural — usuário está usando o app
    requestNotificationPermission().catch(() => {});

    // Intro para novos usuários — mostra uma vez ao abrir o mapa
    shouldShowMapIntro().then((should) => {
      if (should) setShowIntro(true);
    }).catch(() => {});

    // #26 — First-time hint "Toque no mapa para reportar"
    AsyncStorage.getItem('map_hint_shown').then((val) => {
      if (!val) {
        setShowMapHint(true);
        // Auto-dismiss after 5s with fade-out
        setTimeout(() => {
          Animated.timing(hintOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
            setShowMapHint(false);
            AsyncStorage.setItem('map_hint_shown', '1').catch((e) => {
          // #19 — loga falha de storage em dev (ex: dispositivo sem espaço)
          if (__DEV__) console.warn('[MapScreen] hint storage failed:', e);
        });
          });
        }, 5000);
      }
    }).catch(() => {});

    return () => {
      unsubRoad();
      unsubEnt();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const centerOnUser = async (showDeniedAlert = false) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      if (showDeniedAlert) {
        Alert.alert(t('location_disabled_title'), t('location_disabled_msg'), [{ text: 'OK' }]);
      }
      return;
    }
    const loc = await getUserLocation();
    const { latitude, longitude } = loc.coords;
    setUserLocation(latitude, longitude);
    mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
  };

  const getUserLocation = async () => {
    try {
      const cached = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (cached) return cached;
    } catch (_) {}
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  };

  const handleMapPress = useCallback(async (e: MapPressEvent) => {
    if (checkingLocation) return; // #11 — double-tap guard
    const tapped = e.nativeEvent.coordinate;
    setCheckingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // #11 — usa i18n em vez de string PT hardcoded
        Alert.alert(
          t('location_permission_denied') || 'Permissão negada',
          t('location_permission_denied_msg') || 'Ative a localização para reportar eventos.'
        );
        return;
      }

      // #20/#21 — verifica área de água ANTES da distância:
      // evita confundir o usuário com "você está longe" quando o ponto é simplesmente inválido.
      const isWater = await checkIsWaterArea(tapped.latitude, tapped.longitude);
      if (isWater) {
        // #38 — haptic error feedback before the alert for immediate physical cue
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert(
          t('water_area_title') || 'Área inválida',
          t('water_area_msg') || 'Não é possível criar eventos em áreas de água (oceano, baía, lago ou represa).\n\nToque em uma via ou local terrestre.',
          [{ text: 'OK' }]
        );
        return;
      }

      const userLoc = await getUserLocation();
      const { latitude: uLat, longitude: uLon } = userLoc.coords;
      if (!isAdmin) {
        const distKm = haversineDistance(uLat, uLon, tapped.latitude, tapped.longitude);
        if (distKm > MAX_REPORT_RADIUS_KM) {
          Alert.alert(t('too_far_title') || 'Muito longe', `${t('too_far_msg') || `Você só pode reportar eventos num raio de ${MAX_REPORT_RADIUS_KM} km.`}\n\nDistância: ${distKm.toFixed(1)} km.`);
          return;
        }
      }

      let stateUF: string | undefined;
      let cityName: string | undefined;
      let countryCode: string | undefined;
      try {
        // Usa a coordenada TOCADA (não a do usuário) para obter cidade/estado corretos
        // Importante para admins que criam eventos remotamente (item 16)
        const [place] = await Location.reverseGeocodeAsync({ latitude: tapped.latitude, longitude: tapped.longitude });
        stateUF = resolveStateUF(place?.region);
        cityName = place?.city ?? place?.subregion ?? undefined;
        countryCode = place?.isoCountryCode ?? undefined;
        if (countryCode) setUserCountryCode(countryCode);
        if (stateUF) setUserStateUF(stateUF);
      } catch (_) {}
      setPendingCoord({ coordinate: tapped, stateUF, cityName, countryCode });
      setPickerVisible(true);
    } catch (err) {
      // #11 — usa i18n em vez de string PT hardcoded
      Alert.alert(
        t('error') || 'Erro',
        t('location_fetch_error') || 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.'
      );
    } finally {
      setCheckingLocation(false);
    }
  }, [isAdmin]);

  const handleSelectRoad = useCallback(() => { setPickerVisible(false); setRoadModalVisible(true); }, []);
  const handleSelectEntertainment = useCallback(() => {
    const user = getCurrentUser();
    const uid = getCurrentUserId();
    const isAnon = !user || user.isAnonymous || uid === 'anonymous';
    if (isAnon) {
      setPickerVisible(false);
      Alert.alert(t('login_required'), t('login_required_ent'));
      return;
    }
    setPickerVisible(false);
    setEntertainmentModalVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      {mapError && (
        <View style={styles.mapErrorWrap}>
          <Text style={styles.mapErrorEmoji}>🗺️</Text>
          <Text style={styles.mapErrorTitle}>{t('map_unavailable')}</Text>
          <Text style={styles.mapErrorText}>
            {t('map_api_error_description') || 'Verifique se a chave da API do Google Maps está correta e se o serviço "Maps SDK for Android" está ativado no Google Cloud Console.'}
          </Text>
        </View>
      )}

      <ClusteredMapView
        ref={mapRef}
        style={[styles.map, mapError && { opacity: 0 }]}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        customMapStyle={isDarkMode ? mapStyleDark : mapStyleLight}
        onPress={handleMapPress}
        onMapReady={() => {
          setMapReady(true);
          // #5 — fade in search bar after map tiles load (avoids flash of un-styled bar)
          Animated.timing(searchBarOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        }}
        onError={() => setMapError(true)}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsTraffic
        zoomEnabled
        scrollEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        zoomTapEnabled
        // Clustering nativo do react-native-maps (suporte total ao New Architecture)
        clusteringEnabled
        radius={radius}
        minPoints={minPoints}
        animationEnabled
        // Cluster visual customizado
        renderCluster={(cluster: any) => (
          <SmartCluster
            key={`cluster-${cluster.properties?.cluster_id ?? cluster.id}`}
            cluster={cluster}
            zoomTier={zoomTier}
            onPress={handleClusterPress}
          />
        )}
      >
        {roadEvents.map((event) => (
          <EventMarker
            key={`road-${event.id}`}
            event={event}
            onPress={setSelectedRoadEvent}
            zoomTier={zoomTier}
          />
        ))}
        {visibleEntEvents.map((event) => (
          <EntertainmentMarker
            key={`ent-${event.id}`}
            event={event}
            onPress={setSelectedEntEvent}
            zoomTier={zoomTier}
          />
        ))}

        {/* Pin do endereço buscado (dropped pin estilo Google Maps) */}
        {selectedPlace && (
          <Marker
            coordinate={selectedPlace.coords}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.droppedPin}>
              <Text style={styles.droppedPinEmoji}>📍</Text>
            </View>
          </Marker>
        )}

        {/* Heatmap de densidade — limita a 300 eventos para não travar em regiões densas */}
        {heatmapActive && allRoadEvents.length > 0 && (
          <Heatmap
            points={allRoadEvents.slice(0, 300).map((e) => ({
              latitude: e.latitude,
              longitude: e.longitude,
              weight: 1 + e.confirmations * 0.3,
            }))}
            radius={40}
            opacity={0.75}
            gradient={{
              colors: ['#00E5FF', '#FFEB3B', '#FF5722', '#B71C1C'],
              startPoints: [0.1, 0.4, 0.7, 1.0],
              colorMapSize: 256,
            }}
          />
        )}
      </ClusteredMapView>

      {(roadLoading || checkingLocation) && (
        // #27 — position below SearchBar (topInset + searchBar ~56px + gap 8px)
        <View style={[styles.loadingOverlay, { top: topInset + 72 }]}>
          <ActivityIndicator size="small" color="#FF5722" />
          {checkingLocation && <Text style={styles.loadingText}>{t('map_checking')}</Text>}
        </View>
      )}

      {/* SearchBar flutuante no topo — visível apenas após mapReady, com fade-in (#5/#19) */}
      {/* Animated.View precisa de position:'absolute' + pointerEvents='box-none' para flutuar */}
      {/* sobre o mapa sem capturar toques fora da barra */}
      {mapReady && <Animated.View style={[StyleSheet.absoluteFill, { opacity: searchBarOpacity }]} pointerEvents="box-none"><MapSearchBar
        localEvents={localSearchEvents}
        onSelectResult={(r: SearchResult) => {
          mapRef.current?.animateToRegion({
            latitude: r.coords.latitude,
            longitude: r.coords.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }, 600);
          if (r.kind === 'place') {
            // Endereço: solta pin no mapa e exibe card de navegação
            setSelectedPlace(r);
          } else if (r.kind === 'event' && r.eventId) {
            // Evento: abre modal correspondente
            setSelectedPlace(null);
            const ev = r.eventType === 'entertainment'
              ? entertainmentEvents.find((e) => e.id === r.eventId)
              : allRoadEvents.find((e) => e.id === r.eventId);
            if (ev) {
              if (r.eventType === 'entertainment') setSelectedEntEvent(ev as EntertainmentEvent);
              else setSelectedRoadEvent(ev as RoadEvent);
            } else {
              if (__DEV__) console.warn('[MapScreen] search result event not found in store:', r.eventId, r.eventType);
            }
          }
        }}
      /></Animated.View>}

      <TouchableOpacity
        style={[styles.mapBtn, styles.filterBtn, filterStateUF && styles.filterBtnActive]}
        onPress={() => setFilterVisible(true)}
        accessibilityLabel={
          // #4 — label dinâmico indica ao leitor de tela se há filtro ativo
          filterStateUF
            ? (t('filter_btn_label_active') || `Filtrar eventos — região ativa: ${filterStateUF}`)
            : (t('filter_btn_label') || 'Filtrar eventos por região')
        }
        accessibilityRole="button"
      >
        <Text style={styles.mapBtnIcon}>⚙</Text>
        {filterStateUF && <View style={styles.filterDot} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mapBtn, styles.locationBtn]}
        onPress={() => centerOnUser(true)}
        accessibilityLabel={t('location_btn_label') || 'Centralizar na minha localização'}
        accessibilityRole="button"
      >
        <Text style={styles.mapBtnIcon}>📍</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mapBtn, styles.driverBtn, driverModeActive && styles.driverBtnActive]}
        onPress={() => setDriverModeActive((v) => !v)}
        accessibilityLabel="Modo motorista"
        accessibilityRole="button"
      >
        <Text style={styles.mapBtnIcon}>🚘</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mapBtn, styles.heatmapBtn, heatmapActive && styles.heatmapBtnActive]}
        onPress={() => setHeatmapActive((v) => !v)}
        accessibilityLabel="Heatmap de densidade"
        accessibilityRole="button"
      >
        <Text style={styles.mapBtnIcon}>🌡️</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mapBtn, styles.savedRouteBtn]}
        onPress={() => setSavedRouteVisible(true)}
        accessibilityLabel="Rotas salvas"
        accessibilityRole="button"
      >
        <Text style={styles.mapBtnIcon}>🛣️</Text>
      </TouchableOpacity>

      <EventTypePicker
        visible={pickerVisible}
        onSelectRoad={handleSelectRoad}
        onSelectEntertainment={handleSelectEntertainment}
        onClose={() => setPickerVisible(false)}
      />

      <FilterModal visible={filterVisible} onClose={() => setFilterVisible(false)} />

      {pendingCoord && (
        <AddEventModal
          visible={roadModalVisible}
          coordinate={pendingCoord.coordinate}
          stateUF={pendingCoord.stateUF}
          cityName={pendingCoord.cityName}
          countryCode={pendingCoord.countryCode}
          onClose={() => { setRoadModalVisible(false); setPendingCoord(null); }}
          onEventCreated={showAfterEvent}
        />
      )}

      {pendingCoord && (
        <AddEntertainmentModal
          visible={entertainmentModalVisible}
          coordinate={pendingCoord.coordinate}
          stateUF={pendingCoord.stateUF}
          cityName={pendingCoord.cityName}
          countryCode={pendingCoord.countryCode}
          onClose={() => { setEntertainmentModalVisible(false); setPendingCoord(null); }}
          onEventCreated={showAfterEvent}
        />
      )}

      <RoadEventInfoModal
        event={selectedRoadEvent}
        onConfirm={confirmEvent}
        onDeny={denyEvent}
        onClose={() => setSelectedRoadEvent(null)}
      />

      <EntertainmentInfoModal
        event={selectedEntEvent}
        onLike={toggleLike}
        onComment={(ev) => { setSelectedEntEvent(null); setCommentTarget(ev); }}
        onGoToMap={(ev) => { setSelectedEntEvent(null); mapRef.current?.animateToRegion({ latitude: ev.latitude, longitude: ev.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800); }}
        onClose={() => setSelectedEntEvent(null)}
      />

      {commentTarget && (
        <CommentsModal
          visible={!!commentTarget}
          eventId={commentTarget.id}
          eventTitle={commentTarget.title}
          onClose={() => setCommentTarget(null)}
        />
      )}

      {/* Card de navegação — aparece após selecionar endereço na busca */}
      {selectedPlace && (
        <View style={styles.navigateCard}>
          <View style={styles.navigateCardHeader}>
            <Text style={styles.navigateCardEmoji}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.navigateCardTitle} numberOfLines={1}>
                {selectedPlace.title}
              </Text>
              {selectedPlace.subtitle ? (
                <Text style={styles.navigateCardSubtitle} numberOfLines={1}>
                  {selectedPlace.subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setSelectedPlace(null)}
              hitSlop={10}
              accessibilityLabel="Fechar card de navegação"
            >
              <Text style={styles.navigateCardClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.navigateBtn}
            activeOpacity={0.8}
            onPress={() => {
              const { latitude: lat, longitude: lon } = selectedPlace.coords;
              const label = selectedPlace.title;
              Alert.alert(
                '🧭 Navegar',
                `Abrir navegação para:\n${label}`,
                [
                  {
                    text: '🚕 Waze',
                    onPress: () =>
                      Linking.openURL(`waze://?ll=${lat},${lon}&navigate=yes`).catch(() =>
                        Linking.openURL(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`)
                      ),
                  },
                  {
                    text: '🗺️ Google Maps',
                    onPress: () =>
                      Linking.openURL(
                        `https://maps.google.com/?daddr=${lat},${lon}&travelmode=driving`
                      ),
                  },
                  { text: 'Cancelar', style: 'cancel' },
                ]
              );
            }}
          >
            <Text style={styles.navigateBtnText}>🧭  Navegar até aqui</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.adContainer} pointerEvents="box-none">
        <AdBanner />
      </View>

      {/* #34 — Offline banner: delay de 3s evita falso-positivo no sync inicial */}
      {showOfflineBanner && (
        <View style={styles.offlineBanner} pointerEvents="none">
          <Text style={styles.offlineBannerText}>
            📡 {t('offline_banner') || 'Sem conexão — dados podem estar desatualizados'}
          </Text>
        </View>
      )}

      {/* #26 — First-time hint */}
      {showMapHint && (
        <Animated.View style={[styles.mapHint, { opacity: hintOpacity }]} pointerEvents="none">
          <Text style={styles.mapHintText}>
            👆 {t('map_hint') || 'Toque no mapa para reportar um evento'}
          </Text>
        </Animated.View>
      )}

      {/* Introdução para novos usuários */}
      <MapIntroModal
        visible={showIntro}
        onDone={() => setShowIntro(false)}
      />

      {/* Modo motorista */}
      <DriverModeOverlay
        visible={driverModeActive}
        onClose={() => setDriverModeActive(false)}
      />

      {/* Rotas salvas */}
      <SavedRouteModal
        visible={savedRouteVisible}
        onClose={() => setSavedRouteVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  adContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', backgroundColor: 'transparent',
  },
  mapHint: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mapHintText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  offlineBanner: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(239,68,68,0.88)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  loadingOverlay: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  loadingText: { fontSize: 13, color: '#555' },
  // FAB premium estilo Google/Waze — rounded square com shadow forte
  mapBtn: {
    position: 'absolute', right: 14,
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  mapBtnIcon: { fontSize: 24 },
  filterBtn: { bottom: 180 },
  driverBtn: { bottom: 244 },
  driverBtnActive: { backgroundColor: '#0F172A', borderColor: '#FF5722' },
  heatmapBtn: { bottom: 308 },
  heatmapBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#FF5722' },
  savedRouteBtn: { bottom: 372 },
  filterBtnActive: { backgroundColor: '#FFEDD5', borderColor: '#FF5722' },
  filterDot: {
    position: 'absolute', top: 6, right: 6,
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: '#FF5722',
    borderWidth: 2, borderColor: '#fff',
  },
  locationBtn: { bottom: 116 },
  mapErrorWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    zIndex: 10, padding: 32,
  },
  mapErrorEmoji: { fontSize: 56, marginBottom: 12 },
  mapErrorTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  mapErrorText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  // ─── Dropped pin (endereço buscado) ───────────────────────────────────────────
  droppedPin: { alignItems: 'center', justifyContent: 'center' },
  droppedPinEmoji: { fontSize: 36 },

  // ─── Card de navegação ────────────────────────────────────────────────────────
  navigateCard: {
    position: 'absolute',
    bottom: 56, // acima do AdBanner
    left: 14, right: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    gap: 12,
  },
  navigateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navigateCardEmoji: { fontSize: 26 },
  navigateCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    includeFontPadding: false,
  },
  navigateCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    includeFontPadding: false,
  },
  navigateCardClose: {
    fontSize: 16,
    color: '#94A3B8',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  navigateBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navigateBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
