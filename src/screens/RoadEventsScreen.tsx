import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventsStore } from '../store/eventsStore';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { getCurrentUserId } from '../services/authService';
import { timeAgo, timeLeft } from '../utils/time';
import { tRoadCat, tf } from '../utils/i18n';
import { useT } from '../hooks/useT';
import { useAppStore } from '../store/appStore';
import { useUserLocation } from '../hooks/useUserLocation';
import { rw, rh, rf, isTablet } from '../utils/responsive';
import { AdBanner } from '../components/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { useNavigation } from '@react-navigation/native';

function RoadEventCard({ event, onConfirm, onDeny, onGoToMap }: {
  event: RoadEvent;
  onConfirm: (id: string) => void;
  onDeny: (id: string) => void;
  onGoToMap: (event: RoadEvent) => void;
}) {
  const t = useT();
  const meta = EVENT_CATEGORIES[event.category];
  const myUid = getCurrentUserId();
  const alreadyVoted = event.voters.includes(myUid);
  const isOwner = event.userId === myUid;
  const blocked = alreadyVoted || isOwner;

  return (
    <View style={[styles.card, { borderLeftColor: meta.color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: meta.color + '22' }]}>
          <Text style={styles.cardEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Text style={styles.cardMeta}>
            {tRoadCat(event.category)}
            {event.cityName ? ` · ${event.cityName}` : ''}
            {event.stateUF ? ` — ${event.stateUF}` : ''}
          </Text>
        </View>
      </View>

      {event.description ? <Text style={styles.cardDesc}>{event.description}</Text> : null}

      <View style={styles.cardFooter}>
        <Text style={styles.cardTime}>{timeAgo(event.createdAt)}</Text>
        <Text style={styles.cardExpiry}>{timeLeft(event.expiresAt)}</Text>
      </View>

      {alreadyVoted && (
        <Text style={styles.votedLabel}>✅ {t('road_voted')}</Text>
      )}
      {isOwner && !alreadyVoted && (
        <Text style={styles.votedLabel}>📌 {t('road_own')}</Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.confirmBtn, blocked && styles.disabledBtn]}
          onPress={() => !blocked && onConfirm(event.id)}
          disabled={blocked}
        >
          <Text style={[styles.actionText, blocked && styles.disabledText]}>
            {t('road_confirm')} ({event.confirmations})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.denyBtn, blocked && styles.disabledBtn]}
          onPress={() => !blocked && onDeny(event.id)}
          disabled={blocked}
        >
          <Text style={[styles.actionText, blocked && styles.disabledText]}>
            {t('road_deny')} ({event.denials})
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.goToMapBtn} onPress={() => onGoToMap(event)}>
        <Text style={styles.goToMapText}>🗺️ {t('go_to_map_event')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function RoadEventsScreen() {
  const t = useT();
  const { top: topInset } = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const focusOnMap = useAppStore((s) => s.focusOnMap);

  function handleGoToMap(event: RoadEvent) {
    focusOnMap({ lat: event.latitude, lon: event.longitude, title: event.title });
    navigation.navigate('Mapa');
  }
  const [refreshing, setRefreshing] = useState(false);
  const { loading, subscribeToEvents, getFilteredEvents, confirmEvent, denyEvent } = useEventsStore();
  const userStateUF  = useAppStore((s) => s.userStateUF);
  const filterStateUF = useEventsStore((s) => s.filterStateUF);

  // Detecta estado do usuário automaticamente ao montar
  const { detecting, locationDenied } = useUserLocation();

  // Filtro: só eventos do estado do usuário
  // · filtro manual (FilterModal) tem precedência total
  // · se GPS negado/falhou e sem cache: exibe tudo
  // · quando estado conhecido: filtra estritamente (não inclui eventos sem stateUF)
  const events = getFilteredEvents()
    .filter((e) => {
      if (filterStateUF) return e.stateUF === filterStateUF; // filtro manual estrito
      if (locationDenied || !userStateUF) return true;       // sem estado detectado: tudo
      return e.stateUF === userStateUF;                      // filtro por estado do usuário
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  useEffect(() => {
    const unsub = subscribeToEvents();
    return unsub;
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  // Exibe spinner apenas enquanto o GPS ainda não retornou (sem resultado ainda)
  const isLoading = loading || (detecting && !userStateUF);

  // Injeta um marcador de anúncio a cada 5 eventos
  type ListItem = RoadEvent | { __ad: true; id: string };
  const AD_INTERVAL = 5;
  const listData: ListItem[] = [];
  events.forEach((ev, i) => {
    listData.push(ev);
    if ((i + 1) % AD_INTERVAL === 0) {
      listData.push({ __ad: true, id: `ad-road-${i}` });
    }
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>🚗 {t('road_title')}</Text>
        <View style={styles.headerRight}>
          {(userStateUF || filterStateUF) && (
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>
                {filterStateUF
                  ? tf('filter_state_badge', { state: filterStateUF })
                  : userStateUF
                    ? tf('filter_state_badge', { state: userStateUF })
                    : t('filter_all_states')}
              </Text>
            </View>
          )}
          {events.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{events.length}</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#E53935" />
          <Text style={styles.loaderText}>{t('map_checking')}</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => {
            if ('__ad' in item) {
              return (
                <View style={styles.adCard}>
                  <Text style={styles.adLabel}>{t('advertising')}</Text>
                  <AdBanner size={BannerAdSize.MEDIUM_RECTANGLE} />
                </View>
              );
            }
            return <RoadEventCard event={item} onConfirm={confirmEvent} onDeny={denyEvent} onGoToMap={handleGoToMap} />;
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyText}>{t('road_empty')}</Text>
              <Text style={styles.emptyHint}>{t('road_empty_hint')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rw(16), paddingBottom: rh(12),
    backgroundColor: '#1E293B', borderBottomWidth: 0,
  },
  headerTitle: { fontSize: rf(20), fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: rw(8) },
  stateBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: rw(10),
    paddingVertical: rh(4), borderRadius: rw(12), borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  stateBadgeText: { fontSize: rf(12), fontWeight: '700', color: '#fff' },
  countBadge: { backgroundColor: '#FF5722', paddingHorizontal: rw(10), paddingVertical: rh(4), borderRadius: rw(12) },
  countText: { fontSize: rf(13), fontWeight: '700', color: '#fff' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rh(12) },
  loaderText: { fontSize: rf(13), color: '#888' },
  list: { padding: rw(12), gap: rh(12), paddingBottom: rh(24) },
  card: {
    backgroundColor: '#fff', borderRadius: rw(16), padding: rw(14), borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: rw(10), marginBottom: rh(8) },
  iconBadge: { width: rw(44), height: rw(44), borderRadius: rw(22), alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: rf(24) },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: rf(15), fontWeight: '700', color: '#1E293B' },
  cardMeta: { fontSize: rf(12), color: '#94A3B8', marginTop: rh(2) },
  cardDesc: { fontSize: rf(13), color: '#555', marginBottom: rh(8) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: rh(8) },
  cardTime: { fontSize: rf(12), color: '#94A3B8' },
  cardExpiry: { fontSize: rf(12), color: '#FF5722' },
  votedLabel: { fontSize: rf(12), color: '#94A3B8', fontStyle: 'italic', marginBottom: rh(8) },
  actions: { flexDirection: 'row', gap: rw(10) },
  actionBtn: { flex: 1, paddingVertical: rh(11), borderRadius: rw(12), alignItems: 'center' },
  confirmBtn: { backgroundColor: '#E8F5E9' },
  denyBtn: { backgroundColor: '#FBE9E7' },
  disabledBtn: { backgroundColor: '#F1F5F9' },
  actionText: { fontSize: rf(13), fontWeight: '700', color: '#333' },
  disabledText: { color: '#CBD5E1' },
  empty: { alignItems: 'center', marginTop: rh(80), gap: rh(8) },
  emptyEmoji: { fontSize: rf(52) },
  emptyText: { fontSize: rf(16), fontWeight: '600', color: '#555' },
  emptyHint: { fontSize: rf(13), color: '#aaa', textAlign: 'center', paddingHorizontal: rw(32) },
  adCard: {
    backgroundColor: '#fff', borderRadius: rw(16), overflow: 'hidden',
    alignItems: 'center', paddingTop: rh(6),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  adLabel: { fontSize: rf(10), color: '#bbb', marginBottom: rh(4), textTransform: 'uppercase', letterSpacing: 0.5 },
  goToMapBtn: {
    marginTop: rh(10), paddingVertical: rh(9), borderRadius: rw(10),
    backgroundColor: '#EEF2FF', alignItems: 'center',
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  goToMapText: { fontSize: rf(13), fontWeight: '700', color: '#4F46E5' },
});
