import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, MapPressEvent, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
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
import { useAppStore } from '../store/appStore';
import { t } from '../utils/i18n';
import { useT } from '../hooks/useT';
import { AdBanner } from '../components/AdBanner';
import {
  ZoomTier,
  getZoomTier,
  filterRoadEvents,
  filterEntEvents,
} from '../utils/mapZoom';
import { mapStyleLight, mapStyleDark } from '../theme/mapStyle';
import { MapSearchBar, SearchResult } from '../components/ui/MapSearchBar';
import { ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { EVENT_CATEGORIES } from '../types';

const MAX_REPORT_RADIUS_KM = 1;

const INITIAL_REGION = {
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
  const count: number = cluster.properties.point_count;
  const [lon, lat] = cluster.geometry.coordinates;
  const size = clusterSize(count);
  const fontSize = size >= 62 ? 18 : size >= 48 ? 16 : 14;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={false}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size + 16, height: size + 16 }}>
        {/* Halo translúcido externo (estilo Google Maps cluster) */}
        <View style={{
          position: 'absolute',
          width: size + 14,
          height: size + 14,
          borderRadius: (size + 14) / 2,
          backgroundColor: 'rgba(255,107,53,0.18)',
        }} />
        {/* Corpo sólido */}
        <View style={[clusterStyles.body, { width: size, height: size, borderRadius: size / 2 }]}>
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
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
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
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // UI state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [roadModalVisible, setRoadModalVisible] = useState(false);
  const [entertainmentModalVisible, setEntertainmentModalVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [commentTarget, setCommentTarget] = useState<EntertainmentEvent | null>(null);
  const [pendingCoord, setPendingCoord] = useState<PendingCoord | null>(null);
  const [selectedRoadEvent, setSelectedRoadEvent] = useState<RoadEvent | null>(null);
  const [selectedEntEvent, setSelectedEntEvent] = useState<EntertainmentEvent | null>(null);
  const { top: topInset } = useSafeAreaInsets();

  // Zoom inteligente
  const [zoomTier, setZoomTier] = useState<ZoomTier>(
    () => getZoomTier(INITIAL_REGION.latitudeDelta)
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRegionChange = useCallback((region: Region) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setZoomTier((prev) => {
        const next = getZoomTier(region.latitudeDelta);
        return next !== prev ? next : prev;
      });
    }, 120);
  }, []);

  // Quando o cluster é pressionado: dá zoom para revelar os pins
  const handleClusterPress = useCallback((cluster: any) => {
    if (!mapRef.current) return;
    const [lon, lat] = cluster.geometry.coordinates;
    mapRef.current.animateToRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: INITIAL_REGION.latitudeDelta / 3,
      longitudeDelta: INITIAL_REGION.longitudeDelta / 3,
    }, 500);
  }, []);

  // Stores
  const { loading: roadLoading, events: allRoadEvents, subscribeToEvents, confirmEvent, denyEvent, filterStateUF } = useEventsStore();
  const { events: entertainmentEvents, subscribe: subscribeEntertainment, toggleLike } = useEntertainmentStore();
  const isAdmin = useUserStore((s) => s.isAdmin);
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF = useAppStore((s) => s.setUserStateUF);
  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const pendingMapFocus = useAppStore((s) => s.pendingMapFocus);
  const clearMapFocus = useAppStore((s) => s.clearMapFocus);
  const pendingDeepLink = useAppStore((s) => s.pendingDeepLink);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

  // Pins filtrados por tier
  const roadEvents = filterRoadEvents(allRoadEvents, zoomTier);
  const visibleEntEvents = filterEntEvents(entertainmentEvents, zoomTier);

  // Config de cluster dinâmica
  const { radius, minPoints } = CLUSTER_CONFIG[zoomTier];

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
  useEffect(() => {
    if (!pendingDeepLink || !mapReady) return;

    const { type, id } = pendingDeepLink;
    if (type === 'road') {
      const ev = allRoadEvents.find((e) => e.id === id);
      if (ev) {
        setSelectedRoadEvent(ev);
        mapRef.current?.animateToRegion({
          latitude: ev.latitude,
          longitude: ev.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 800);
        setPendingDeepLink(null);
      }
    } else if (type === 'entertainment') {
      const ev = entertainmentEvents.find((e) => e.id === id);
      if (ev) {
        setSelectedEntEvent(ev);
        mapRef.current?.animateToRegion({
          latitude: ev.latitude,
          longitude: ev.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 800);
        setPendingDeepLink(null);
      }
    }
  }, [pendingDeepLink, mapReady, allRoadEvents, entertainmentEvents]);

  useEffect(() => {
    const unsubRoad = subscribeToEvents();
    const unsubEnt = subscribeEntertainment();
    centerOnUser();
    return () => { unsubRoad(); unsubEnt(); };
  }, []);

  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
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
    const tapped = e.nativeEvent.coordinate;
    setCheckingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Ative a localização para reportar eventos.');
        return;
      }
      const userLoc = await getUserLocation();
      const { latitude: uLat, longitude: uLon } = userLoc.coords;
      if (!isAdmin) {
        const distKm = haversineDistance(uLat, uLon, tapped.latitude, tapped.longitude);
        if (distKm > MAX_REPORT_RADIUS_KM) {
          Alert.alert('Muito longe', `Você só pode reportar eventos num raio de ${MAX_REPORT_RADIUS_KM} km.\n\nDistância: ${distKm.toFixed(1)} km.`);
          return;
        }
      }
      let stateUF: string | undefined;
      let cityName: string | undefined;
      let countryCode: string | undefined;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: uLat, longitude: uLon });
        stateUF = resolveStateUF(place?.region);
        cityName = place?.city ?? place?.subregion ?? undefined;
        countryCode = place?.isoCountryCode ?? undefined;
        if (countryCode) setUserCountryCode(countryCode);
        if (stateUF) setUserStateUF(stateUF);
      } catch (_) {}
      setPendingCoord({ coordinate: tapped, stateUF, cityName, countryCode });
      setPickerVisible(true);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.');
    } finally {
      setCheckingLocation(false);
    }
  }, [isAdmin]);

  const handleSelectRoad = useCallback(() => { setPickerVisible(false); setRoadModalVisible(true); }, []);
  const handleSelectEntertainment = useCallback(() => { setPickerVisible(false); setEntertainmentModalVisible(true); }, []);

  return (
    <View style={styles.container}>
      {mapError && (
        <View style={styles.mapErrorWrap}>
          <Text style={styles.mapErrorEmoji}>🗺️</Text>
          <Text style={styles.mapErrorTitle}>{t('map_unavailable')}</Text>
          <Text style={styles.mapErrorText}>
            Verifique se a chave da API do Google Maps está correta e se o serviço "Maps SDK for Android" está ativado no Google Cloud Console.
          </Text>
        </View>
      )}

      <ClusteredMapView
        ref={mapRef}
        style={[styles.map, mapError && { opacity: 0 }]}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        customMapStyle={isDarkMode ? mapStyleDark : mapStyleLight}
        onPress={handleMapPress}
        onMapReady={() => setMapReady(true)}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        showsTraffic
        zoomEnabled
        scrollEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        zoomTapEnabled
        // Cluster dinâmico por tier
        radius={radius}
        minPoints={minPoints}
        animationEnabled
        // Cluster visual customizado
        renderCluster={(cluster: any) => (
          <SmartCluster
            key={`cluster-${cluster.id}`}
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
      </ClusteredMapView>

      {(roadLoading || checkingLocation) && (
        <View style={[styles.loadingOverlay, { top: topInset + 8 }]}>
          <ActivityIndicator size="small" color="#FF5722" />
          {checkingLocation && <Text style={styles.loadingText}>{t('map_checking')}</Text>}
        </View>
      )}

      {/* SearchBar flutuante no topo (Google Maps style) */}
      <MapSearchBar
        localEvents={[
          ...visibleEntEvents.map((e) => ({
            id: e.id, title: e.title,
            category: e.category, cityName: e.cityName, stateUF: e.stateUF,
            latitude: e.latitude, longitude: e.longitude,
            emoji: ENTERTAINMENT_CATEGORIES[e.category]?.emoji,
            type: 'entertainment' as const,
          })),
          ...roadEvents.map((e) => ({
            id: e.id, title: e.title,
            category: e.category, cityName: e.cityName, stateUF: e.stateUF,
            latitude: e.latitude, longitude: e.longitude,
            emoji: EVENT_CATEGORIES[e.category]?.emoji,
            type: 'road' as const,
          })),
        ]}
        onSelectResult={(r: SearchResult) => {
          mapRef.current?.animateToRegion({
            latitude: r.coords.latitude,
            longitude: r.coords.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }, 600);
          // Se for evento, abre o modal correspondente
          if (r.kind === 'event' && r.eventId) {
            const ev = r.eventType === 'entertainment'
              ? entertainmentEvents.find((e) => e.id === r.eventId)
              : allRoadEvents.find((e) => e.id === r.eventId);
            if (ev) {
              if (r.eventType === 'entertainment') setSelectedEntEvent(ev as any);
              else setSelectedRoadEvent(ev as any);
            }
          }
        }}
      />

      <TouchableOpacity
        style={[styles.mapBtn, styles.filterBtn, filterStateUF && styles.filterBtnActive]}
        onPress={() => setFilterVisible(true)}
      >
        <Text style={styles.mapBtnIcon}>⚙</Text>
        {filterStateUF && <View style={styles.filterDot} />}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.mapBtn, styles.locationBtn]} onPress={centerOnUser}>
        <Text style={styles.mapBtnIcon}>📍</Text>
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

      <View style={styles.adContainer}>
        <AdBanner />
      </View>
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
});
