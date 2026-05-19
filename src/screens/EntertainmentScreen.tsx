import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image,
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
import { useT } from '../hooks/useT';
import { tEntCat, tTier, tf } from '../utils/i18n';
import { useUserLocation } from '../hooks/useUserLocation';
import { rw, rh, rf } from '../utils/responsive';
import { AdBanner } from '../components/AdBanner';
import { BannerAdSize } from '../components/AdBanner';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PROMOTION_TIERS } from '../types/promotion';
import { ShareSheet } from '../components/ShareSheet';

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
  onGoToMap,
  onShare,
}: {
  event: EntertainmentEvent;
  onLike: (id: string) => void;
  onOpenComments: (event: EntertainmentEvent) => void;
  onGoToMap: (event: EntertainmentEvent) => void;
  onShare: (event: EntertainmentEvent) => void;
}) {
  const t = useT();
  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? { emoji: '📍', color: '#607D8B', label: event.category };
  const myUid = getCurrentUserId() ?? '';
  const likes = Array.isArray(event.likes) ? event.likes : [];
  const liked = likes.includes(myUid);
  const isOwner = event.userId === myUid;

  const isPromoted = !!(event.promotionTier && event.promotionEndDate && event.promotionEndDate > Date.now());
  const tierConfig = isPromoted ? PROMOTION_TIERS[event.promotionTier!] : null;

  // Foto: prefere foto de promoção, cai para foto padrão do evento
  const photoUri = event.promotionPhotoUrl ?? event.photoUrl ?? null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: isPromoted ? tierConfig!.pinColor : meta.color },
        isPromoted && styles.promotedCard,
        photoUri ? styles.cardWithPhoto : null,
      ]}
      activeOpacity={0.92}
      onPress={() => onOpenComments(event)}
    >
      {/* Foto do evento — aparece no topo quando disponível */}
      {photoUri ? (
        <View style={styles.cardPhotoWrap}>
          <Image source={{ uri: photoUri }} style={styles.cardPhoto} resizeMode="cover" />
          {/* Overlay com badge de promoção sobre a foto */}
          {isPromoted && tierConfig && (
            <View style={[styles.cardPhotoTierBadge, { backgroundColor: tierConfig.pinColor }]}>
              <Text style={styles.cardPhotoTierText}>
                {tierConfig.emoji} {tTier(tierConfig.id)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* Badge de promoção sem foto — aparece acima do header */
        isPromoted && tierConfig && (
          <View style={[styles.featuredBadge, { backgroundColor: tierConfig.pinColor + '22', borderColor: tierConfig.pinColor + '55' }]}>
            <Text style={[styles.featuredBadgeText, { color: tierConfig.pinColor }]}>
              {tierConfig.emoji} {tTier(tierConfig.id)}
            </Text>
          </View>
        )
      )}

      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: meta.color + '22' }]}>
          <Text style={styles.cardEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Text style={styles.cardMeta}>
            {tEntCat(event.category)}{event.cityName ? ` · ${event.cityName}` : ''} · {timeAgo(event.createdAt)}
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
            {liked ? '❤️' : '🤍'} {likes.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(event)}>
          <Text style={styles.actionBtnText}>💬 {event.commentCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBottom}>
        <TouchableOpacity style={styles.shareCardBtn} onPress={(e) => { e.stopPropagation?.(); onShare(event); }}>
          <Text style={styles.shareCardBtnText}>↗ {t('share')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.goToMapBtn, { flex: 1 }]} onPress={(e) => { e.stopPropagation?.(); onGoToMap(event); }}>
          <Text style={styles.goToMapText}>🗺️ {t('go_to_event')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Carrossel de eventos patrocinados ───────────────────────────────────────
function FeaturedStrip({
  events,
  onPress,
}: {
  events: EntertainmentEvent[];
  onPress: (event: EntertainmentEvent) => void;
}) {
  const t = useT();
  if (events.length === 0) return null;

  return (
    <View style={styles.stripWrap}>
      <Text style={styles.stripTitle}>🌟 {t('featured')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripScroll}>
        {events.map((ev) => {
          const meta = ENTERTAINMENT_CATEGORIES[ev.category];
          const tierConfig = ev.promotionTier ? PROMOTION_TIERS[ev.promotionTier] : null;
          return (
            <TouchableOpacity key={ev.id} style={styles.stripCard} onPress={() => onPress(ev)} activeOpacity={0.88}>
              {/* Foto ou cor sólida de fundo */}
              {ev.promotionPhotoUrl ? (
                <Image source={{ uri: ev.promotionPhotoUrl }} style={styles.stripPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.stripPhoto, { backgroundColor: tierConfig?.pinColor ?? meta.color, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 32 }}>{meta.emoji}</Text>
                </View>
              )}
              {/* Tier badge */}
              {tierConfig && (
                <View style={[styles.stripTierBadge, { backgroundColor: tierConfig.pinColor }]}>
                  <Text style={styles.stripTierText}>{tierConfig.emoji} {tTier(tierConfig.id)}</Text>
                </View>
              )}
              <View style={styles.stripInfo}>
                <Text style={styles.stripCardTitle} numberOfLines={1}>{ev.title}</Text>
                {ev.cityName ? <Text style={styles.stripCardCity}>{ev.cityName}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function EntertainmentScreen() {
  const t = useT();
  const { top: topInset } = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Entretenimento: { eventId?: string } }, 'Entretenimento'>>();
  const focusOnMap = useAppStore((s) => s.focusOnMap);

  function handleGoToMap(event: EntertainmentEvent) {
    focusOnMap({ lat: event.latitude, lon: event.longitude, title: event.title });
    navigation.navigate('Mapa');
  }
  const [addVisible, setAddVisible] = useState(false);
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EntertainmentEvent | null>(null);
  const [commentTarget, setCommentTarget] = useState<EntertainmentEvent | null>(null);
  const [shareTarget, setShareTarget] = useState<EntertainmentEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { events: allEvents, loading, hasMore, subscribe, toggleLike, loadMore } = useEntertainmentStore();
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF = useAppStore((s) => s.setUserStateUF);
  const userStateUF = useAppStore((s) => s.userStateUF);
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
      // Filtro estrito: apenas eventos do estado do usuário
      filtered = allEvents.filter((e) => e.stateUF === userStateUF);
    }

    const tierWeight = (e: typeof allEvents[0]) => {
      if (!e.promotionTier || !e.promotionEndDate || e.promotionEndDate <= Date.now()) return 0;
      return e.promotionTier === 'ouro' ? 3 : e.promotionTier === 'prata' ? 2 : 1;
    };
    return [...filtered].sort((a, b) => {
      const wa = tierWeight(a);
      const wb = tierWeight(b);
      if (wa !== wb) return wb - wa;
      return b.createdAt - a.createdAt;
    });
  })();

  // Eventos em destaque Prata/Ouro para o carrossel
  const featuredEvents = events.filter(
    (e) => e.promotionTier && ['prata', 'ouro'].includes(e.promotionTier)
      && e.promotionEndDate && e.promotionEndDate > Date.now()
  );

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, []);

  // Abre automaticamente um evento quando navega do perfil com eventId
  useEffect(() => {
    const eventId = route.params?.eventId;
    if (!eventId || events.length === 0) return;
    const found = events.find((e) => e.id === eventId);
    if (found) setSelectedEvent(found);
  }, [route.params?.eventId, events]);

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

  // Injeta um marcador de anúncio a cada 5 eventos
  type ListItem = EntertainmentEvent | { __ad: true; id: string };
  const AD_INTERVAL = 5;
  const listData: ListItem[] = [];
  events.forEach((ev, i) => {
    listData.push(ev);
    if ((i + 1) % AD_INTERVAL === 0) {
      listData.push({ __ad: true, id: `ad-ent-${i}` });
    }
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🎉 {t('ent_title')}</Text>
          {userStateUF && (
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>
                {tf('filter_state_badge', { state: userStateUF })}
              </Text>
            </View>
          )}
        </View>
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
          data={listData}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={<FeaturedStrip events={featuredEvents} onPress={setSelectedEvent} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => {
            if ('__ad' in item) {
              return (
                <View style={styles.adCard}>
                  <Text style={styles.adLabel}>{t('advertising')}</Text>
                  <AdBanner size={BannerAdSize.MEDIUM_RECTANGLE} />
                </View>
              );
            }
            return (
              <EventCard
                event={item}
                onLike={toggleLike}
                onOpenComments={setSelectedEvent}
                onGoToMap={handleGoToMap}
                onShare={setShareTarget}
              />
            );
          }}
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

      {/* Modal de detalhes do evento */}
      <EntertainmentInfoModal
        event={selectedEvent}
        onLike={(id) => { toggleLike(id); }}
        onComment={(ev) => { setSelectedEvent(null); setCommentTarget(ev); }}
        onGoToMap={(ev) => { setSelectedEvent(null); handleGoToMap(ev); }}
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

      {shareTarget && (
        <ShareSheet
          visible={!!shareTarget}
          onClose={() => setShareTarget(null)}
          title={shareTarget.title}
          description={shareTarget.description}
          category={`${ENTERTAINMENT_CATEGORIES[shareTarget.category]?.emoji ?? '🎉'} ${tEntCat(shareTarget.category)}`}
          location={[shareTarget.cityName, shareTarget.stateUF].filter(Boolean).join(' — ')}
          eventId={shareTarget.id}
          eventType="entertainment"
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  stateBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  stateBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: '#FF5722', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rh(12) },
  loaderText: { fontSize: rf(13), color: '#888' },
  list: { padding: rw(12), gap: rh(12), paddingBottom: rh(24) },
  card: {
    backgroundColor: '#fff', borderRadius: rw(16), padding: rw(14), borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    overflow: 'hidden',
  },
  cardWithPhoto: { paddingTop: 0 },
  // Margem negativa nas laterais e topo para que a foto sangre até as bordas do card
  cardPhotoWrap: {
    height: rh(180), position: 'relative',
    marginHorizontal: -rw(14), marginTop: 0,
    marginBottom: rh(4),
  },
  cardPhoto: { width: '100%', height: '100%' },
  cardPhotoTierBadge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  cardPhotoTierText: { fontSize: rf(11), fontWeight: '800', color: '#fff' },
  featuredCard: {
    borderLeftColor: '#F9A825',
    shadowColor: '#F9A825', shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  promotedCard: {
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 5,
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
  cardBottom: { flexDirection: 'row', gap: rw(8), marginTop: rh(10) },
  shareCardBtn: {
    paddingVertical: rh(9), paddingHorizontal: rw(14), borderRadius: rw(10),
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  shareCardBtnText: { fontSize: rf(13), fontWeight: '700', color: '#475569' },
  goToMapBtn: {
    paddingVertical: rh(9), borderRadius: rw(10),
    backgroundColor: '#EEF2FF', alignItems: 'center',
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  goToMapText: { fontSize: rf(13), fontWeight: '700', color: '#4F46E5' },
  adCard: {
    backgroundColor: '#fff', borderRadius: rw(16), overflow: 'hidden',
    alignItems: 'center', paddingTop: rh(6),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  adLabel: { fontSize: rf(10), color: '#bbb', marginBottom: rh(4), textTransform: 'uppercase', letterSpacing: 0.5 },

  // ─── FeaturedStrip ───────────────────────────────────────────────────────
  stripWrap: { marginBottom: rh(8) },
  stripTitle: { fontSize: rf(13), fontWeight: '800', color: '#1E293B', marginBottom: rh(10), paddingHorizontal: rw(2) },
  stripScroll: { gap: rw(10), paddingBottom: rh(4) },
  stripCard: {
    width: rw(160), borderRadius: rw(14), backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 4,
  },
  stripPhoto: { width: '100%', height: rh(90) },
  stripTierBadge: {
    position: 'absolute', top: rh(6), left: rw(6),
    borderRadius: rw(8), paddingHorizontal: rw(7), paddingVertical: rh(3),
  },
  stripTierText: { fontSize: rf(10), fontWeight: '800', color: '#fff' },
  stripInfo: { padding: rw(10) },
  stripCardTitle: { fontSize: rf(13), fontWeight: '700', color: '#1E293B' },
  stripCardCity: { fontSize: rf(11), color: '#94A3B8', marginTop: rh(2) },
});
