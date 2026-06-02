import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventsStore } from '../store/eventsStore';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { getCurrentUserId } from '../services/authService';
import { timeAgo, timeLeft } from '../utils/time';
import { tRoadCat, tf } from '../utils/i18n';
import { useT } from '../hooks/useT';
import { useTick } from '../hooks/useTick';
import { useAppStore } from '../store/appStore';
import { useUserLocation } from '../hooks/useUserLocation';
import { rw, rh, rf, isTablet } from '../utils/responsive';
import { AdBanner } from '../components/AdBanner';
import { BannerAdSize } from '../components/AdBanner';
import { useNavigation } from '@react-navigation/native';
import { ShareSheet } from '../components/ShareSheet';

function RoadEventCard({ event, currentUid, onConfirm, onDeny, onGoToMap, onShare }: {
  event: RoadEvent;
  currentUid: string;
  onConfirm: (id: string) => void;
  onDeny: (id: string) => void;
  onGoToMap: (event: RoadEvent) => void;
  onShare: (event: RoadEvent) => void; // #24
}) {
  const t = useT();
  useTick(); // #14 — re-renders every 60s so timeAgo/timeLeft stay fresh
  const meta = EVENT_CATEGORIES[event.category];
  const myUid = currentUid;
  const alreadyVoted = myUid !== 'anonymous' && event.voters.includes(myUid);
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

      <TouchableOpacity
        style={styles.goToMapBtn}
        onPress={() => onGoToMap(event)}
        // #6 — button navigates immediately; no async work needed, disabled not necessary
        activeOpacity={0.7}
      >
        <Text style={styles.goToMapText}>🗺️ {t('go_to_map_event')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shareRoadBtn} onPress={() => onShare(event)}>
        <Text style={styles.shareRoadBtnText}>↗ {t('share') || 'Compartilhar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function RoadEventsScreen() {
  const t = useT();
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? '#0F172A' : '#F1F5F9';
  const cardBg = isDark ? '#1E293B' : '#fff';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subColor = isDark ? '#94A3B8' : '#64748B';
  const { top: topInset } = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const focusOnMap = useAppStore((s) => s.focusOnMap);

  function handleGoToMap(event: RoadEvent) {
    // #15 — abre o InfoModal do evento automaticamente ao navegar para o mapa
    setPendingDeepLink({ type: 'road', id: event.id });
    focusOnMap({ lat: event.latitude, lon: event.longitude, title: event.title });
    navigation.navigate('Mapa');
  }
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // #23
  const [shareTarget, setShareTarget] = useState<RoadEvent | null>(null); // #24
  const { loading, subscribeToEvents, reloadEvents, getFilteredEvents, confirmEvent, denyEvent } = useEventsStore();
  // UID calculado uma vez na tela — não repetir em cada item da lista
  const currentUid = useMemo(() => getCurrentUserId() ?? 'anonymous', []);

  const handleConfirm = useCallback(async (id: string) => {
    try { await confirmEvent(id); } catch { /* erro de rede — não há rollback necessário */ }
  }, [confirmEvent]);

  const handleDeny = useCallback(async (id: string) => {
    try { await denyEvent(id); } catch { /* erro de rede — não há rollback necessário */ }
  }, [denyEvent]);
  const userStateUF  = useAppStore((s) => s.userStateUF);
  const filterStateUF = useEventsStore((s) => s.filterStateUF);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

  // Detecta estado do usuário automaticamente ao montar
  const { detecting, locationDenied } = useUserLocation();

  // #8 — seleciona eventos do store para que useMemo reaja às mudanças
  const allEvents = useEventsStore((s) => s.events);
  const events = useMemo(() => {
    return getFilteredEvents()
      .filter((e) => {
        if (filterStateUF) return e.stateUF === filterStateUF;
        if (locationDenied || !userStateUF) return true;
        return e.stateUF === userStateUF;
      })
      .filter((e) => !selectedCategory || e.category === selectedCategory)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allEvents, filterStateUF, locationDenied, userStateUF, selectedCategory]);

  useEffect(() => {
    const unsub = subscribeToEvents();
    return unsub;
  }, []);

  // #4 — handleRefresh real: força re-subscribe para buscar dados frescos do Firestore
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    reloadEvents();
    // Aguarda loading voltar a false ou timeout de 3s
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!useEventsStore.getState().loading) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 3000);
    });
    setRefreshing(false);
  }, [reloadEvents]);

  // Exibe spinner apenas enquanto o GPS ainda não retornou (sem resultado ainda)
  const isLoading = loading || (detecting && !userStateUF);

  // #7 — listData memoizado para evitar re-mount dos AdBanners a cada render
  type ListItem = RoadEvent | { __ad: true; id: string };
  const AD_INTERVAL = 5;
  const listData: ListItem[] = useMemo(() => {
    const result: ListItem[] = [];
    events.forEach((ev, i) => {
      result.push(ev);
      if ((i + 1) % AD_INTERVAL === 0) {
        result.push({ __ad: true, id: `ad-after-${ev.id}` });
      }
    });
    return result;
  }, [events]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: cardBg, borderBottomColor: isDark ? '#1E293B' : '#f0f0f0' }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>🚗 {t('road_title')}</Text>
        <View style={styles.headerRight}>
              {/* #30 — only show state badge when there is actually a state to display */}
          {(filterStateUF || userStateUF) && (
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>
                {filterStateUF
                  ? tf('filter_state_badge', { state: filterStateUF })
                  : tf('filter_state_badge', { state: userStateUF! })}
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

      {/* #23 — filtro por categoria */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBarContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.catChip, !selectedCategory && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.75}
          >
            <Text style={[styles.catChipText, !selectedCategory && styles.catChipTextActive]}>
              {t('filter_all_states') || 'Todos'}
            </Text>
          </TouchableOpacity>
          {(Object.entries(EVENT_CATEGORIES) as [string, typeof EVENT_CATEGORIES[keyof typeof EVENT_CATEGORIES]][]).map(([key, meta]) => {
            const isActive = selectedCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.catChip,
                  isActive
                    ? { backgroundColor: meta.color, borderColor: meta.color }
                    : { borderColor: 'rgba(255,255,255,0.25)' },
                ]}
                onPress={() => setSelectedCategory(isActive ? null : key)}
                activeOpacity={0.75}
              >
                <Text style={styles.catChipEmoji}>{meta.emoji}</Text>
                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
            return <RoadEventCard event={item} currentUid={currentUid} onConfirm={handleConfirm} onDeny={handleDeny} onGoToMap={handleGoToMap} onShare={setShareTarget} />;
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{selectedCategory ? '🔍' : '✅'}</Text>
              <Text style={styles.emptyText}>
                {selectedCategory ? (t('road_empty_filtered') || 'Nenhum alerta nesta categoria') : t('road_empty')}
              </Text>
              <Text style={styles.emptyHint}>
                {/* #27 — hint tells user to clear filter when category filter is active */}
                {selectedCategory
                  ? (t('road_empty_filtered_hint') || 'Toque em "Todos" para ver todos os alertas.')
                  : t('road_empty_hint')}
              </Text>
            </View>
          }
        />
      )}

      {shareTarget && (
        <ShareSheet
          visible={!!shareTarget}
          onClose={() => setShareTarget(null)}
          title={shareTarget.title}
          category={`${EVENT_CATEGORIES[shareTarget.category]?.emoji} ${tRoadCat(shareTarget.category)}`}
          location={[shareTarget.cityName, shareTarget.stateUF].filter(Boolean).join(' — ')}
          eventId={shareTarget.id}
          eventType="road"
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
  // categoryBar: View wrapper garante altura fixa — evita colapso do ScrollView
  // horizontal no Android quando alignItems estava no contentContainerStyle
  categoryBar: { backgroundColor: '#1E293B', height: 52 },
  categoryBarContent: {
    flexDirection: 'row',       // explícito: garante linha horizontal sem wrap
    alignItems: 'center',       // agora está no View pai que tem altura definida
    paddingHorizontal: rw(12),
    paddingVertical: 8,
    gap: rw(8),
    minHeight: 52,              // impede colapso em telas com rh() muito pequeno
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: rw(4),
    paddingHorizontal: rw(12), paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
    flexShrink: 0,              // impede que chips encolham quando há muitos
  },
  catChipActive: { backgroundColor: '#FF5722', borderColor: '#FF5722' },
  catChipEmoji: { fontSize: rf(13) },
  catChipText: { fontSize: rf(12), fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  catChipTextActive: { color: '#fff' },
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
  shareRoadBtn: {
    marginTop: rh(6), paddingVertical: rh(8), borderRadius: rw(10),
    backgroundColor: '#F0FDF4', alignItems: 'center',
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  shareRoadBtnText: { fontSize: rf(13), fontWeight: '700', color: '#16A34A' },
  goToMapBtn: {
    marginTop: rh(10), paddingVertical: rh(9), borderRadius: rw(10),
    backgroundColor: '#EEF2FF', alignItems: 'center',
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  goToMapText: { fontSize: rf(13), fontWeight: '700', color: '#4F46E5' },
});
