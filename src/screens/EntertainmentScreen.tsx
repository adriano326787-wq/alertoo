import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES, EntertainmentCategory } from '../types/entertainment';
import { AddEntertainmentModal } from '../components/AddEntertainmentModal';
import { CommentsModal } from '../components/CommentsModal';
import { EntertainmentInfoModal } from '../components/EntertainmentInfoModal';
import { getCurrentUserId, getCurrentUser } from '../services/authService';
import { useUserStore } from '../store/userStore';
import { timeAgo, timeLeft } from '../utils/time';
import { resolveRegion } from '../utils/brazilGeo';
import { useAppStore } from '../store/appStore';
import { useT } from '../hooks/useT';
import { useTick } from '../hooks/useTick';
import { tEntCat, tTier, tf, t } from '../utils/i18n';
import { useUserLocation } from '../hooks/useUserLocation';
import { rw, rh, rf } from '../utils/responsive';
import { AdBanner } from '../components/AdBanner';
import { BannerAdSize } from '../components/AdBanner';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PROMOTION_TIERS } from '../types/promotion';
import { ShareSheet } from '../components/ShareSheet';
import { haversineDistance } from '../utils/geo';
import { formatDistance } from '../utils/distance';
import { SkeletonList } from '../components/SkeletonCard';

interface PendingAdd {
  coordinate: { latitude: number; longitude: number };
  stateUF?: string;
  cityName?: string;
  countryCode?: string;
}

function EventCard({
  event,
  currentUid,
  onLike,
  onOpenComments,
  onGoToMap,
  onShare,
  userLat,
  userLon,
}: {
  event: EntertainmentEvent;
  currentUid: string;
  onLike: (id: string) => void;
  onOpenComments: (event: EntertainmentEvent) => void;
  onGoToMap: (event: EntertainmentEvent) => void;
  onShare: (event: EntertainmentEvent) => void;
  userLat: number | null;
  userLon: number | null;
}) {
  const t = useT();
  // useTick removido — o componente pai já chama useTick(60_000), evitando N timers desnecessários
  const meta = ENTERTAINMENT_CATEGORIES[event.category] ?? { emoji: '📍', color: '#607D8B', label: event.category };
  const myUid = currentUid;
  const likes = Array.isArray(event.likes) ? event.likes : [];
  const liked = likes.includes(myUid);
  const isOwner = event.userId === myUid;
  const distanceKm = (userLat != null && userLon != null)
    ? haversineDistance(userLat, userLon, event.latitude, event.longitude)
    : null;

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
          <ImageWithFallback uri={photoUri} style={styles.cardPhoto} fallbackColor={meta.color + '33'} fallbackEmoji={meta.emoji} />
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
            {distanceKm != null ? ` · 📍 ${formatDistance(distanceKm)}` : ''}
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

// ─── Image com fallback em erro de rede ──────────────────────────────────────
const ImageWithFallback = React.memo(function ImageWithFallback({
  uri, style, fallbackColor, fallbackEmoji,
}: { uri: string; style: any; fallbackColor: string; fallbackEmoji: string }) {
  const [error, setError] = React.useState(false);
  if (error) {
    return (
      <View style={[style, { backgroundColor: fallbackColor, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 32 }}>{fallbackEmoji}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setError(true)} />;
});

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
          const meta = ENTERTAINMENT_CATEGORIES[ev.category] ?? { emoji: '🎉', color: '#6A1B9A', label: ev.category };
          const tierConfig = ev.promotionTier ? PROMOTION_TIERS[ev.promotionTier] : null;
          return (
            <TouchableOpacity key={ev.id} style={styles.stripCard} onPress={() => onPress(ev)} activeOpacity={0.88}>
              {/* Foto ou cor sólida de fundo — prefere foto de promoção, cai para foto do evento */}
              {(ev.promotionPhotoUrl ?? ev.photoUrl) ? (
                <ImageWithFallback
                  uri={(ev.promotionPhotoUrl ?? ev.photoUrl)!}
                  style={styles.stripPhoto}
                  fallbackColor={tierConfig?.pinColor ?? meta.color}
                  fallbackEmoji={meta.emoji}
                />
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

  // AdMob — interstitial após criar evento
  const { showAfterEvent } = useInterstitialAd();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Entretenimento: { eventId?: string } }, 'Entretenimento'>>();
  const focusOnMap = useAppStore((s) => s.focusOnMap);

  const handleGoToMap = useCallback((event: EntertainmentEvent) => {
    focusOnMap({ lat: event.latitude, lon: event.longitude, title: event.title });
    navigation.navigate('Mapa');
  }, [focusOnMap, navigation]);
  const [addVisible, setAddVisible] = useState(false);
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EntertainmentEvent | null>(null);
  const [commentTarget, setCommentTarget] = useState<EntertainmentEvent | null>(null);
  const [shareTarget, setShareTarget] = useState<EntertainmentEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EntertainmentCategory | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'expiring'>('recent');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  // #2 — isMounted guard previne setState em componente desmontado durante refresh
  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const { events: allEvents, loading, hasMore, error: storeError, subscribe, forceRefresh, toggleLike, loadMore } = useEntertainmentStore();
  const handleLike = useCallback(async (eventId: string) => {
    try { await toggleLike(eventId); } catch { /* optimistic update já revertido pelo store */ }
  }, [toggleLike]);
  // UID calculado uma vez por render da tela, não dentro de cada EventCard (item 21)
  const currentUid = useMemo(() => getCurrentUserId() ?? '', []);
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF = useAppStore((s) => s.setUserStateUF);
  const userStateUF = useAppStore((s) => s.userStateUF);
  const exploreStateUF = useAppStore((s) => s.exploreStateUF);
  // #31 — coordenadas cacheadas (preenchidas quando o usuário visita o mapa) para
  // exibir distância nos cards sem pedir permissão de GPS de novo nesta tela
  const userLat = useAppStore((s) => s.userLat);
  const userLon = useAppStore((s) => s.userLon);
  // Detecta estado do usuário automaticamente ao montar
  const { detecting, locationDenied } = useUserLocation();

  // #24 — tick so featuredEvents re-filters when promotionEndDate passes (avoids stale promoted events)
  useTick(60_000);

  // Filtro + sort memoizados — recalcula quando allEvents/userStateUF/activeCategory/sortBy muda
  const events = useMemo(() => {
    const now = Date.now();
    let filtered: typeof allEvents;
    if (exploreStateUF) {
      filtered = allEvents.filter((e) => e.stateUF === exploreStateUF && e.expiresAt > now);
    } else if (locationDenied || !userStateUF) {
      filtered = allEvents.filter((e) => e.expiresAt > now);
    } else {
      filtered = allEvents.filter((e) => e.stateUF === userStateUF && e.expiresAt > now);
    }
    // Filtro por categoria
    if (activeCategory) {
      filtered = filtered.filter((e) => e.category === activeCategory);
    }
    const tierWeight = (e: typeof allEvents[0]) => {
      if (!e.promotionTier || !e.promotionEndDate || e.promotionEndDate <= now) return 0;
      return e.promotionTier === 'ouro' ? 3 : e.promotionTier === 'prata' ? 2 : 1;
    };
    return [...filtered].sort((a, b) => {
      // Promovidos sempre primeiro (independente do sortBy)
      const wa = tierWeight(a);
      const wb = tierWeight(b);
      if (wa !== wb) return wb - wa;
      // Ordenação secundária conforme seleção do usuário
      if (sortBy === 'popular') {
        const likesA = Array.isArray(a.likes) ? a.likes.length : 0;
        const likesB = Array.isArray(b.likes) ? b.likes.length : 0;
        return likesB - likesA;
      }
      if (sortBy === 'expiring') {
        return a.expiresAt - b.expiresAt; // expira mais cedo primeiro
      }
      return b.createdAt - a.createdAt; // 'recent' (padrão)
    });
  }, [allEvents, userStateUF, exploreStateUF, locationDenied, activeCategory, sortBy]);

  // Eventos em destaque Prata/Ouro para o carrossel (memoizado, item 15)
  const featuredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter(
      (e) => e.promotionTier && ['prata', 'ouro'].includes(e.promotionTier)
        && e.promotionEndDate && e.promotionEndDate > now
    );
  }, [events]);

  useEffect(() => {
    const unsub = subscribe(exploreStateUF ?? (locationDenied ? null : userStateUF));
    return unsub;
  }, [userStateUF, locationDenied, exploreStateUF]);

  // #10 — Abre automaticamente um evento quando navega com eventId.
  // Não descarta silenciosamente quando events ainda não carregou:
  // o effect re-executa quando events muda, então o evento será encontrado
  // assim que o store receber o primeiro snapshot.
  useEffect(() => {
    const eventId = route.params?.eventId;
    if (!eventId) return;
    if (loading) return; // aguarda o primeiro snapshot
    const found = events.find((e) => e.id === eventId);
    if (found) setSelectedEvent(found);
  }, [route.params?.eventId, events, loading]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // #4 — forceRefresh reinicia a subscription sem duplicar o ref-count
    forceRefresh();
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    await Promise.race([
      new Promise<void>((resolve) => {
        pollInterval = setInterval(() => {
          if (!useEntertainmentStore.getState().loading) {
            clearInterval(pollInterval!);
            pollInterval = null;
            resolve();
          }
        }, 100);
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);
    if (pollInterval !== null) clearInterval(pollInterval);
    // #2 — só atualiza estado se o componente ainda estiver montado
    if (isMountedRef.current) setRefreshing(false);
  }, [forceRefresh]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadMore(); // item 29: agora tem try/catch no store e aqui também
    } catch {
      Alert.alert(t('error'), t('error_load_more'));
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loadMore]);

  const handleAdd = useCallback(async () => {
    // Guard: apenas usuários autenticados podem criar eventos de entretenimento
    const user = getCurrentUser();
    const uid = getCurrentUserId();
    const isAnon = !user || user.isAnonymous || uid === 'anonymous';
    if (isAnon) {
      Alert.alert(t('login_required'), t('login_required_ent'));
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('location_permission_denied'), t('location_permission_msg'));
        return;
      }
      // #3 — tratamento explícito: tenta posição em cache, cai para GPS atual,
      // e propaga o erro caso ambos falhem (ex: GPS desativado)
      let loc;
      try {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (cached) {
          loc = cached;
        } else {
          loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
      } catch (_) {
        // last known falhou — tenta GPS direto; se falhar, o catch externo exibe o erro
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
        countryCode = place?.isoCountryCode ?? undefined;
        stateUF = resolveRegion(place?.region, countryCode);
        cityName = place?.city ?? place?.subregion ?? undefined;
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
      Alert.alert(t('error'), t('location_fetch_error'));
    }
  }, []);

  // Injeta anúncios com ID estável baseado no ID do evento âncora, não no índice (item 22)
  // Evita re-mount do AdBanner quando novos eventos chegam no topo da lista
  type ListItem = EntertainmentEvent | { __ad: true; id: string };
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
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🎉 {t('ent_title')}</Text>
          {(exploreStateUF || userStateUF) && (
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>
                {tf('filter_state_badge', { state: exploreStateUF ?? userStateUF! })}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>{t('ent_add')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Barra de filtros ── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Chip "Todos" */}
          <TouchableOpacity
            style={[styles.filterChip, !activeCategory && styles.filterChipActive]}
            onPress={() => setActiveCategory(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, !activeCategory && styles.filterChipTextActive]}>
              🎯 Todos
            </Text>
          </TouchableOpacity>

          {/* Chips de categoria */}
          {(Object.entries(ENTERTAINMENT_CATEGORIES) as [EntertainmentCategory, typeof ENTERTAINMENT_CATEGORIES[EntertainmentCategory]][]).map(([key, meta]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, activeCategory === key && styles.filterChipActive, activeCategory === key && { borderColor: meta.color, backgroundColor: meta.color + '18' }]}
              onPress={() => setActiveCategory(activeCategory === key ? null : key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, activeCategory === key && { color: meta.color, fontWeight: '700' }]}>
                {meta.emoji} {meta.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Botão de ordenação */}
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.sortBtnText}>
            {sortBy === 'recent' ? '🕐' : sortBy === 'popular' ? '🔥' : '⏳'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de ordenação */}
      <Modal transparent animationType="fade" visible={sortModalVisible} onRequestClose={() => setSortModalVisible(false)}>
        <Pressable style={styles.sortOverlay} onPress={() => setSortModalVisible(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Ordenar por</Text>
            {([
              { key: 'recent',  label: '🕐 Mais recentes' },
              { key: 'popular', label: '🔥 Mais curtidos' },
              { key: 'expiring',label: '⏳ Expirando em breve' },
            ] as { key: typeof sortBy; label: string }[]).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.sortOption, sortBy === key && styles.sortOptionActive]}
                onPress={() => { setSortBy(key); setSortModalVisible(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === key && styles.sortOptionTextActive]}>
                  {label}
                </Text>
                {sortBy === key && <Text style={styles.sortCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {storeError && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Text style={styles.errorBannerText}>⚠ {storeError} {t('error_retry_suffix')}</Text>
        </TouchableOpacity>
      )}

      {(loading || (detecting && !userStateUF)) ? (
        <SkeletonList count={5} withPhoto />
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
          // #32 — virtualização: cards têm altura variável (foto opcional, descrição,
          // endereço), então getItemLayout não é viável; estes parâmetros ainda reduzem
          // o trabalho de render em listas longas com muitas fotos
          windowSize={9}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
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
                currentUid={currentUid}
                onLike={handleLike}
                onOpenComments={setSelectedEvent}
                onGoToMap={handleGoToMap}
                onShare={setShareTarget}
                userLat={userLat}
                userLon={userLon}
              />
            );
          }}
          ListEmptyComponent={
            // #33 — diferencia "filtro de categoria sem resultado" (ação: limpar filtro)
            // de "realmente não há eventos na região" (ação: criar um)
            activeCategory ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyText}>{t('ent_empty_filtered') || 'Nenhum evento nesta categoria'}</Text>
                <Text style={styles.emptyHint}>{t('ent_empty_filtered_hint') || 'Toque em "Todos" para ver todos os eventos.'}</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setActiveCategory(null)}>
                  <Text style={styles.emptyAddText}>🎯 Todos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎪</Text>
                <Text style={styles.emptyText}>{t('ent_empty')}</Text>
                <Text style={styles.emptyHint}>{t('ent_empty_hint')}</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAdd}>
                  <Text style={styles.emptyAddText}>+ {t('ent_add')}</Text>
                </TouchableOpacity>
              </View>
            )
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
          onEventCreated={showAfterEvent}
        />
      )}

      {/* Modal de detalhes do evento */}
      {/* #21 — resolve live event from store so commentCount stays fresh when CommentsModal posts */}
      <EntertainmentInfoModal
        event={selectedEvent ? (allEvents.find(e => e.id === selectedEvent.id) ?? selectedEvent) : null}
        onLike={(id) => { toggleLike(id); }}
        onComment={(ev) => { setSelectedEvent(null); setCommentTarget(ev); }}
        onGoToMap={(ev) => { setSelectedEvent(null); handleGoToMap(ev); }}
        onClose={() => setSelectedEvent(null)}
      />

      {commentTarget && (() => {
        // #29 — resolve fresh event from store so title/commentCount reflect latest state
        const liveTarget = allEvents.find((e) => e.id === commentTarget.id) ?? commentTarget;
        return (
          <CommentsModal
            visible={!!commentTarget}
            eventId={liveTarget.id}
            eventTitle={liveTarget.title}
            onClose={() => setCommentTarget(null)}
          />
        );
      })()}

      {shareTarget && (
        <ShareSheet
          visible={!!shareTarget}
          onClose={() => setShareTarget(null)}
          title={shareTarget.title}
          description={shareTarget.description}
          category={`${ENTERTAINMENT_CATEGORIES[shareTarget.category]?.emoji ?? '🎉'} ${tEntCat(shareTarget.category)}`}
          categoryColor={ENTERTAINMENT_CATEGORIES[shareTarget.category]?.color ?? '#6A1B9A'}
          location={[shareTarget.cityName, shareTarget.stateUF].filter(Boolean).join(' — ')}
          eventId={shareTarget.id}
          eventType="entertainment"
          photoUrl={shareTarget.promotionPhotoUrl || shareTarget.photoUrl}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  errorBanner: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FFB74D',
  },
  errorBannerText: { fontSize: 13, color: '#E65100', fontWeight: '600' },
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
  emptyAddBtn: { marginTop: rh(12), backgroundColor: '#6A1B9A', borderRadius: 12, paddingHorizontal: rw(24), paddingVertical: rh(12) },
  emptyAddText: { color: '#fff', fontSize: rf(14), fontWeight: '700' },
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
  // ─── Filter bar ─────────────────────────────────────────────────────────────
  filterBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingBottom: rh(12),
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  filterScroll: { paddingHorizontal: rw(12), gap: rw(8) },
  filterChip: {
    paddingHorizontal: rw(12), paddingVertical: rh(6),
    borderRadius: rw(20), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    borderColor: '#FF5722', backgroundColor: 'rgba(255,87,34,0.15)',
  },
  filterChipText: { fontSize: rf(12), fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  filterChipTextActive: { color: '#FF5722', fontWeight: '800' },
  sortBtn: {
    width: rw(40), height: rw(40), borderRadius: rw(20),
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
    marginRight: rw(12), marginLeft: rw(4), flexShrink: 0,
  },
  sortBtnText: { fontSize: rf(18) },
  // ─── Sort modal ──────────────────────────────────────────────────────────────
  sortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sortModal: {
    backgroundColor: '#fff', borderTopLeftRadius: rw(20), borderTopRightRadius: rw(20),
    padding: rw(20), paddingBottom: rh(36), gap: rh(4),
  },
  sortModalTitle: { fontSize: rf(16), fontWeight: '800', color: '#1E293B', marginBottom: rh(8) },
  sortOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: rh(14), paddingHorizontal: rw(12),
    borderRadius: rw(12),
  },
  sortOptionActive: { backgroundColor: '#FFF3EE' },
  sortOptionText: { fontSize: rf(15), color: '#475569', fontWeight: '600' },
  sortOptionTextActive: { color: '#FF5722', fontWeight: '800' },
  sortCheck: { fontSize: rf(16), color: '#FF5722', fontWeight: '800' },

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
