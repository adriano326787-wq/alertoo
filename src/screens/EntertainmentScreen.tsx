import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { AddEntertainmentModal } from '../components/AddEntertainmentModal';
import { CommentsModal } from '../components/CommentsModal';
import { EntertainmentInfoModal } from '../components/EntertainmentInfoModal';
import { getCurrentUserId } from '../services/authService';
import { useUserStore } from '../store/userStore';
import { timeAgo, timeLeft } from '../utils/time';
import { resolveStateUF } from '../utils/brazilGeo';
import { useAppStore } from '../store/appStore';
import { t } from '../utils/i18n';
import { useUserLocation } from '../hooks/useUserLocation';
import { rw, rh, rf } from '../utils/responsive';

interface PendingAdd {
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
}

function EventCard({
  event,
  onLike,
  onOpenComments,
}: {
  event: EntertainmentEvent;
  onLike: (id: string) => void;
  onOpenComments: (event: EntertainmentEvent) => void;
}) {
  const meta = ENTERTAINMENT_CATEGORIES[event.category];
  const myUid = getCurrentUserId();
  const liked = event.likes.includes(myUid);
  const isOwner = event.userId === myUid;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: meta.color }, event.isFeatured && styles.featuredCard]}
      activeOpacity={0.92}
      onPress={() => onOpenComments(event)}
    >
      {/* Badge de destaque */}
      {event.isFeatured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>⭐ Destaque</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: meta.color + '22' }]}>
          <Text style={styles.cardEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Text style={styles.cardMeta}>
            {meta.label}{event.cityName ? ` · ${event.cityName}` : ''} · {timeAgo(event.createdAt)}
          </Text>
        </View>
      </View>

      {event.description ? <Text style={styles.cardDesc}>{event.description}</Text> : null}
      {event.address ? <Text style={styles.cardAddress}>📍 {event.address}</Text> : null}

      <Text style={styles.cardExpiry}>⏱ {timeLeft(event.expiresAt)}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, liked && styles.likedBtn, isOwner && styles.disabledBtn]}
          onPress={(e) => { e.stopPropagation?.(); if (!isOwner) onLike(event.id); }}
          disabled={isOwner}
        >
          <Text style={[styles.actionBtnText, isOwner && styles.disabledText]}>
            {liked ? '❤️' : '🤍'} {event.likes.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(event)}>
          <Text style={styles.actionBtnText}>💬 {event.commentCount}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tapHint}>Toque para ver comentários</Text>
    </TouchableOpacity>
  );
}

export function EntertainmentScreen() {
  const { top: topInset } = useSafeAreaInsets();
  const [addVisible, setAddVisible] = useState(false);
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EntertainmentEvent | null>(null);
  const [commentTarget, setCommentTarget] = useState<EntertainmentEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { events: allEvents, loading, hasMore, subscribe, toggleLike, toggleFeatured, loadMore } = useEntertainmentStore();
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF = useAppStore((s) => s.setUserStateUF);
  const userStateUF = useAppStore((s) => s.userStateUF);
  const isAdmin = useUserStore((s) => s.isAdmin);
  useAppStore((s) => s.langVersion); // re-render on language change

  // Detecta estado do usuário automaticamente ao montar
  const { detecting, locationDenied } = useUserLocation();

  // Filtro: só eventos do estado do usuário (ou sem estado definido — legado)
  // · se GPS negado/falhou/sem região: exibe tudo
  // · enquanto detecta: spinner (não filtra ainda)
  // Ordenação: destaques primeiro, depois por data de criação
  const events = (() => {
    let filtered: typeof allEvents;
    if (locationDenied || !userStateUF) {
      filtered = allEvents;
    } else {
      // Inclui eventos do estado do usuário E eventos sem stateUF (legado)
      filtered = allEvents.filter((e) => !e.stateUF || e.stateUF === userStateUF);
    }

    return [...filtered].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return b.createdAt - a.createdAt;
    });
  })();

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // onSnapshot já mantém os dados atualizados — apenas re-assina para garantir
    const unsub = subscribe();
    await new Promise((r) => setTimeout(r, 600));
    unsub();
    setRefreshing(false);
  }, [subscribe]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadMore();
    setLoadingMore(false);
  }, [hasMore, loadingMore, loadMore]);

  const handleAdd = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Ative a localização para adicionar eventos.');
        return;
      }
      let loc;
      try {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        loc = cached ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch (_) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      let stateUF: string | undefined;
      let cityName: string | undefined;
      let countryCode: string | undefined;
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        stateUF = resolveStateUF(place?.region);
        cityName = place?.city ?? place?.subregion ?? undefined;
        countryCode = place?.isoCountryCode ?? undefined;
        if (countryCode) setUserCountryCode(countryCode);
        if (stateUF) setUserStateUF(stateUF);
      } catch (_) {}
      setPending({
        coordinate: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        stateUF,
        cityName,
        countryCode,
      });
      setAddVisible(true);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível obter sua localização. Verifique o GPS.');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>🎉 {t('ent_title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>{t('ent_add')}</Text>
        </TouchableOpacity>
      </View>

      {(loading || (detecting && !userStateUF)) ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#6A1B9A" />
          <Text style={styles.loaderText}>{t('map_checking')}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onLike={toggleLike}
              onOpenComments={setSelectedEvent}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎪</Text>
              <Text style={styles.emptyText}>{t('ent_empty')}</Text>
              <Text style={styles.emptyHint}>{t('ent_empty_hint')}</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color="#6A1B9A" />
            ) : hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>{t('ent_load_more')}</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {pending && (
        <AddEntertainmentModal
          visible={addVisible}
          coordinate={pending.coordinate}
          stateUF={pending.stateUF}
          cityName={pending.cityName}
          countryCode={pending.countryCode}
          onClose={() => { setAddVisible(false); setPending(null); }}
        />
      )}

      {/* Modal de detalhes do evento (com controle de destaque para admin) */}
      <EntertainmentInfoModal
        event={selectedEvent}
        isAdmin={isAdmin}
        onLike={(id) => { toggleLike(id); }}
        onToggleFeatured={toggleFeatured}
        onComment={(ev) => { setSelectedEvent(null); setCommentTarget(ev); }}
        onClose={() => setSelectedEvent(null)}
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#1E293B', borderBottomWidth: 0,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  addBtn: { backgroundColor: '#FF5722', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rh(12) },
  loaderText: { fontSize: rf(13), color: '#888' },
  list: { padding: rw(12), gap: rh(12), paddingBottom: rh(24) },
  card: {
    backgroundColor: '#fff', borderRadius: rw(16), padding: rw(14), borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  featuredCard: {
    borderLeftColor: '#F9A825',
    shadowColor: '#F9A825', shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  featuredBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF8E1', borderRadius: rw(6),
    paddingHorizontal: rw(8), paddingVertical: rh(3), marginBottom: rh(8),
    borderWidth: 1, borderColor: '#FFE082',
  },
  featuredBadgeText: { fontSize: rf(11), fontWeight: '700', color: '#F57F17' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: rw(10), marginBottom: rh(8) },
  categoryBadge: { width: rw(44), height: rw(44), borderRadius: rw(22), alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: rf(24) },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: rf(15), fontWeight: '700', color: '#1E293B' },
  cardMeta: { fontSize: rf(12), color: '#94A3B8', marginTop: rh(2) },
  cardDesc: { fontSize: rf(13), color: '#555', marginBottom: rh(8) },
  cardAddress: { fontSize: rf(12), color: '#FF5722', marginBottom: rh(10) },
  cardExpiry: { fontSize: rf(11), color: '#FF5722', marginBottom: rh(8), fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: rw(8) },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rw(12), paddingVertical: rh(8),
    borderRadius: rw(20), backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  likedBtn: { backgroundColor: '#FCE4EC', borderColor: '#F48FB1' },
  disabledBtn: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.5 },
  actionBtnText: { fontSize: rf(13), fontWeight: '600', color: '#444' },
  disabledText: { color: '#CBD5E1' },
  tapHint: { fontSize: rf(11), color: '#CBD5E1', marginTop: rh(10), textAlign: 'right' },
  empty: { alignItems: 'center', marginTop: rh(80), gap: rh(8) },
  emptyEmoji: { fontSize: rf(52) },
  emptyText: { fontSize: rf(16), fontWeight: '600', color: '#555' },
  emptyHint: { fontSize: rf(13), color: '#aaa', textAlign: 'center', paddingHorizontal: rw(32) },
  footerLoader: { marginVertical: rh(16) },
  loadMoreBtn: { alignItems: 'center', paddingVertical: rh(14) },
  loadMoreText: { fontSize: rf(14), fontWeight: '600', color: '#FF5722' },
});
