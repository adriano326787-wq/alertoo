import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClusteredMapView from 'react-native-map-clustering';
import { MapPressEvent, PROVIDER_GOOGLE } from 'react-native-maps';
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

const MAX_REPORT_RADIUS_KM = 10;

const INITIAL_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface PendingCoord {
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
}

export function MapScreen() {
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

  // Stores
  const { loading: roadLoading, events: allRoadEvents, subscribeToEvents, confirmEvent, denyEvent, filterStateUF } = useEventsStore();
  const { events: entertainmentEvents, subscribe: subscribeEntertainment, toggleLike, toggleFeatured } = useEntertainmentStore();
  const isAdmin = useUserStore((s) => s.isAdmin);
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF = useAppStore((s) => s.setUserStateUF);
  // Mapa exibe TODOS os pins, sem filtro de estado
  const roadEvents = allRoadEvents;

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
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 800);
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
          Alert.alert(
            'Muito longe',
            `Você só pode reportar eventos num raio de ${MAX_REPORT_RADIUS_KM} km.\n\nDistância: ${distKm.toFixed(1)} km.`
          );
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

  const handleSelectRoad = useCallback(() => {
    setPickerVisible(false);
    setRoadModalVisible(true);
  }, []);

  const handleSelectEntertainment = useCallback(() => {
    setPickerVisible(false);
    setEntertainmentModalVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Tela de erro se o Google Maps não inicializar */}
      {mapError && (
        <View style={styles.mapErrorWrap}>
          <Text style={styles.mapErrorEmoji}>🗺️</Text>
          <Text style={styles.mapErrorTitle}>Mapa indisponível</Text>
          <Text style={styles.mapErrorText}>
            Verifique se a chave da API do Google Maps está correta e se o serviço "Maps SDK for Android" está ativado no Google Cloud Console.
          </Text>
        </View>
      )}

      {/* ClusteredMapView agrupa pins próximos automaticamente */}
      <ClusteredMapView
        ref={mapRef}
        style={[styles.map, mapError && { opacity: 0 }]}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        onPress={handleMapPress}
        onMapReady={() => setMapReady(true)}
        onMapLoadingError={() => setMapError(true)}
        showsUserLocation
        showsMyLocationButton={false}
        clusterColor="#FF5722"
        clusterTextColor="#fff"
        clusterFontFamily={undefined}
        animationEnabled
        radius={40}
        minPoints={3}
      >
        {/* Pins de estrada */}
        {roadEvents.map((event) => (
          <EventMarker
            key={`road-${event.id}`}
            event={event}
            onPress={setSelectedRoadEvent}
          />
        ))}

        {/* Pins de entretenimento */}
        {entertainmentEvents.map((event) => (
          <EntertainmentMarker
            key={`ent-${event.id}`}
            event={event}
            onPress={setSelectedEntEvent}
          />
        ))}
      </ClusteredMapView>

      {/* Loading */}
      {(roadLoading || checkingLocation) && (
        <View style={[styles.loadingOverlay, { top: topInset + 8 }]}>
          <ActivityIndicator size="small" color="#FF5722" />
          {checkingLocation && <Text style={styles.loadingText}>Verificando localização...</Text>}
        </View>
      )}

      {/* Dica no topo */}
      <View style={[styles.hint, { top: topInset + 8 }]}>
        <Text style={styles.hintText}>{t('map_tap_hint')}</Text>
      </View>

      {/* Botão filtro */}
      <TouchableOpacity
        style={[styles.mapBtn, styles.filterBtn, filterStateUF && styles.filterBtnActive]}
        onPress={() => setFilterVisible(true)}
      >
        <Text style={styles.mapBtnIcon}>🔍</Text>
        {filterStateUF && <View style={styles.filterDot} />}
      </TouchableOpacity>

      {/* Botão localização */}
      <TouchableOpacity style={[styles.mapBtn, styles.locationBtn]} onPress={centerOnUser}>
        <Text style={styles.mapBtnIcon}>📍</Text>
      </TouchableOpacity>

      {/* Seletor de tipo */}
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
        isAdmin={isAdmin}
        onLike={toggleLike}
        onToggleFeatured={toggleFeatured}
        onComment={(ev) => { setSelectedEntEvent(null); setCommentTarget(ev); }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  loadingText: { fontSize: 13, color: '#555' },
  hint: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  hintText: { color: '#fff', fontSize: 13 },
  mapBtn: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  mapBtnIcon: { fontSize: 22 },
  filterBtn: { bottom: 170, backgroundColor: '#fff' },
  filterBtnActive: { backgroundColor: '#FBE9E7' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5722' },
  locationBtn: { bottom: 110, backgroundColor: '#fff' },
  mapErrorWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    zIndex: 10, padding: 32,
  },
  mapErrorEmoji: { fontSize: 56, marginBottom: 12 },
  mapErrorTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  mapErrorText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
});
