import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import {
  doc, updateDoc, collection, query, where, onSnapshot, Timestamp,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { useAppStore } from '../store/appStore';
import { getRank, POINTS } from '../types/user';
import { RankBadge, RankProgressBar, AllRanksLegend } from '../components/RankBadge';
import { signOut, getCurrentUser } from '../services/authService';
import { db } from '../services/firebase';
import { useT } from '../hooks/useT';
import { tEntCat, tTier } from '../utils/i18n';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MercadoPagoModal } from '../components/MercadoPagoModal';
import { PromoteEventModal } from '../components/PromoteEventModal';
import { BuyCreditsScreen } from './BuyCreditsScreen';
import { getUserCredits, daysRemaining } from '../services/promotionService';
import { PROMOTION_TIERS } from '../types/promotion';
import { EntertainmentEvent } from '../types/entertainment';
import { uploadProfilePhoto } from '../services/storageService';
import { ShareSheet } from '../components/ShareSheet';
import { LanguagePicker } from '../components/LanguagePicker';
import { ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { useFavoritesStore } from '../store/favoritesStore';
import { FavoriteEvent } from '../services/favoritesService';

export function ProfileScreen() {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile, clearProfile, updateDisplayName, isAdmin } = useUserStore();
  const t = useT();
  const setPendingAuthTab = useAppStore((s) => s.setPendingAuthTab);
  const currentUser = getCurrentUser();
  const isAnonymous = currentUser?.isAnonymous ?? true;

  const [editVisible, setEditVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [donateVisible, setDonateVisible] = useState(false);

  // ─── Promoção ────────────────────────────────────────────────────────────────
  const [userCredits, setUserCredits] = useState(0);
  const [userEvents, setUserEvents] = useState<EntertainmentEvent[]>([]);
  const [promoteModalVisible, setPromoteModalVisible] = useState(false);
  const [buyCreditsVisible, setBuyCreditsVisible] = useState(false);
  const [selectedEventForPromo, setSelectedEventForPromo] = useState<EntertainmentEvent | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // ─── Foto de perfil ──────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ─── Compartilhar ────────────────────────────────────────────────────────────
  const [shareEvent, setShareEvent] = useState<EntertainmentEvent | null>(null);

  // ─── Favoritos ───────────────────────────────────────────────────────────────
  const favorites = useFavoritesStore((s) => s.favorites);
  const favLoading = useFavoritesStore((s) => s.loading);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const [favExpanded, setFavExpanded] = useState(true);

  // Carrega créditos uma vez
  const loadCredits = useCallback(async () => {
    if (!currentUser || currentUser.isAnonymous) return;
    try {
      const credits = await getUserCredits(currentUser.uid);
      setUserCredits(credits);
    } catch {}
  }, [currentUser]);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  // ─── Assinatura em tempo real dos eventos do usuário ─────────────────────────
  const unsubEventsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) {
      setLoadingEvents(false);
      return;
    }
    setLoadingEvents(true);
    const q = query(
      collection(db, 'entertainment_events'),
      where('userId', '==', currentUser.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const events: EntertainmentEvent[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            category: data.category,
            title: data.title,
            description: data.description ?? undefined,
            address: data.address ?? undefined,
            latitude: data.latitude,
            longitude: data.longitude,
            createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? now,
            expiresAt: (data.expiresAt as Timestamp)?.toMillis?.() ?? now,
            userId: data.userId,
            likes: data.likes ?? [],
            commentCount: data.commentCount ?? 0,
            isFeatured: data.isFeatured ?? false,
            promotionTier: data.promotionTier ?? null,
            promotionEndDate: data.promotionEndDate
              ? (data.promotionEndDate as Timestamp).toMillis()
              : null,
            promotionPhotoUrl: data.promotionPhotoUrl ?? null,
            photoUrl: data.photoUrl ?? null,
          } as EntertainmentEvent;
        })
        .filter((e) => e.expiresAt > now)
        .sort((a, b) => b.expiresAt - a.expiresAt);
      setUserEvents(events);
      setLoadingEvents(false);
    }, () => setLoadingEvents(false));

    unsubEventsRef.current = unsub;
    return () => { unsub(); unsubEventsRef.current = null; };
  }, [currentUser]);

  // ─── Foto de perfil ───────────────────────────────────────────────────────────
  const handlePickPhoto = useCallback(async () => {
    if (!currentUser) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para escolher uma foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(currentUser.uid, result.assets[0].uri);
      await updateProfile(currentUser, { photoURL: url });
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
      useUserStore.getState().updatePhotoURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [currentUser]);


  async function handleSignOut() {
    Alert.alert(
      t('profile_sign_out'),
      t('profile_sign_out_msg'),
      [
        { text: t('profile_sign_out_cancel'), style: 'cancel' },
        {
          text: t('profile_sign_out_confirm'), style: 'destructive',
          onPress: async () => {
            await signOut();
            clearProfile();
          },
        },
      ]
    );
  }

  // Redireciona para AuthScreen na aba escolhida sem precisar de navigation
  async function handleGoToAuth(tab: 'login' | 'register') {
    setPendingAuthTab(tab);
    await signOut();
    clearProfile();
  }

  async function handleSaveName() {
    const trimmed = newName.trim();
    if (!trimmed || !currentUser) return;
    setSaving(true);
    try {
      await updateProfile(currentUser, { displayName: trimmed });
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName: trimmed });
      updateDisplayName(trimmed);
      setEditVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o nome. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Tela para visitantes anônimos ───────────────────────────────────────
  if (isAnonymous || !profile) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: top + 16 }]}
      >
        <View style={styles.anonCard}>
          <Text style={styles.anonEmoji}>👤</Text>
          <Text style={styles.anonTitle}>{t('profile_visitor')}</Text>
          <Text style={styles.anonDesc}>{t('profile_visitor_desc')}</Text>

          {/* Botões diretos de criação / login */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => handleGoToAuth('register')}
          >
            <Text style={styles.createBtnText}>✨ {t('profile_create_account')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => handleGoToAuth('login')}
          >
            <Text style={styles.loginBtnText}>{t('profile_sign_in')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.anonRanks}>
            <Text style={styles.sectionLabel}>{t('profile_ranks_title')}</Text>
            <AllRanksLegend />
          </View>

          <View style={styles.anonPoints}>
            <Text style={styles.sectionLabel}>{t('profile_how_to_earn')}</Text>
            {[
              { label: t('points_road_event'),   pts: POINTS.ROAD_EVENT_CREATED },
              { label: t('points_ent_event'),     pts: POINTS.ENTERTAINMENT_EVENT_CREATED },
              { label: t('points_confirmation'),  pts: POINTS.CONFIRMATION_RECEIVED },
              { label: t('points_like'),          pts: POINTS.LIKE_RECEIVED },
              { label: t('points_comment'),       pts: POINTS.COMMENT_POSTED },
            ].map((item) => (
              <View key={item.label} style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>{item.label}</Text>
                <Text style={[styles.pointsValue, { color: '#43A047' }]}>+{item.pts} pts</Text>
              </View>
            ))}
          </View>

          <View style={[styles.divider, { marginTop: 24 }]} />

          <LanguagePicker />

          <TouchableOpacity style={[styles.donateBtn, { width: '100%' }]} onPress={() => setDonateVisible(true)}>
            <Text style={styles.donateBtnEmoji}>💛</Text>
            <View style={styles.donateBtnTexts}>
              <Text style={styles.donateBtnTitle}>{t('support_title')}</Text>
              <Text style={styles.donateBtnSub}>{t('support_desc')}</Text>
            </View>
            <Text style={styles.donateBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <MercadoPagoModal visible={donateVisible} onClose={() => setDonateVisible(false)} />
      </ScrollView>
    );
  }

  const rank = getRank(profile.points);

  const memberSince = profile.createdAt
    ? format(new Date(profile.createdAt), "MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: top + 16 }]}
    >
      {/* Avatar + info */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarWrap} disabled={uploadingPhoto}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: rank.color }]}>
              <Text style={styles.avatarEmoji}>{rank.emoji}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.avatarEditIcon}>📷</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nameRow}
          onPress={() => { setNewName(profile.displayName); setEditVisible(true); }}
        >
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>

        {profile.email ? <Text style={styles.subInfo}>{profile.email}</Text> : null}
        {profile.phone ? <Text style={styles.subInfo}>{profile.phone}</Text> : null}

        {memberSince && (
          <Text style={styles.memberSince}>🗓️ {t('profile_member_since')} {memberSince}</Text>
        )}

        <RankBadge points={profile.points} size="large" />
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>⚙️ {t('admin_label')}</Text>
          </View>
        )}
      </View>

      {/* Pontuação */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile_points_title')}</Text>
        <Text style={[styles.points, { color: rank.color }]}>{profile.points} pts</Text>
        <RankProgressBar points={profile.points} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.eventsReported}</Text>
          <Text style={styles.statLabel}>{t('profile_events_reported')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.commentsPosted}</Text>
          <Text style={styles.statLabel}>{t('profile_comments_posted')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{rank.emoji}</Text>
          <Text style={[styles.statLabel, { color: rank.color }]}>{rank.label}</Text>
        </View>
      </View>

      {/* Como ganhar pontos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile_how_to_earn_short')}</Text>
        {[
          { label: t('points_road_event'),   pts: POINTS.ROAD_EVENT_CREATED },
          { label: t('points_ent_event'),     pts: POINTS.ENTERTAINMENT_EVENT_CREATED },
          { label: t('points_confirmation'),  pts: POINTS.CONFIRMATION_RECEIVED },
          { label: t('points_like'),          pts: POINTS.LIKE_RECEIVED },
          { label: t('points_comment'),       pts: POINTS.COMMENT_POSTED },
          { label: t('points_denial'),        pts: POINTS.DENIAL_RECEIVED },
        ].map((item) => (
          <View key={item.label} style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>{item.label}</Text>
            <Text style={[styles.pointsValue, { color: item.pts > 0 ? '#43A047' : '#E53935' }]}>
              {item.pts > 0 ? `+${item.pts}` : item.pts} pts
            </Text>
          </View>
        ))}
      </View>

      {/* Todos os ranks */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile_all_ranks')}</Text>
        <AllRanksLegend />
      </View>

      {/* ── Widget de Créditos ───────────────────────────────────────────────── */}
      <View style={styles.creditsCard}>
        <View style={styles.creditsLeft}>
          <Text style={styles.creditsEmoji}>🪙</Text>
          <View>
            <Text style={styles.creditsCount}>{isAdmin ? '∞' : userCredits}</Text>
            <Text style={styles.creditsLabel}>{isAdmin ? 'créditos ilimitados (Admin)' : `crédito${userCredits !== 1 ? 's' : ''} disponível${userCredits !== 1 ? 'is' : ''}`}</Text>
          </View>
        </View>
        {!isAdmin && (
          <TouchableOpacity style={styles.buyCreditsBtn} onPress={() => setBuyCreditsVisible(true)}>
            <Text style={styles.buyCreditsText}>+ {t('buy_credits')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Meus Eventos Ativos ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎉 {t('my_active_events')}</Text>
        {loadingEvents ? (
          <ActivityIndicator color="#E53935" style={{ marginVertical: 16 }} />
        ) : userEvents.length === 0 ? (
          <Text style={styles.noEventsText}>{t('no_active_events')}</Text>
        ) : (
          userEvents.map((ev) => {
            const isPromoted = !!(ev.promotionTier && ev.promotionEndDate && ev.promotionEndDate > Date.now());
            const tierConfig = isPromoted ? PROMOTION_TIERS[ev.promotionTier!] : null;
            const days = isPromoted && ev.promotionEndDate ? daysRemaining(ev.promotionEndDate) : null;
            return (
              <View key={ev.id} style={styles.eventItem}>
                <View style={styles.eventItemLeft}>
                  <Text style={styles.eventItemTitle} numberOfLines={1}>{ev.title}</Text>
                  {isPromoted && tierConfig ? (
                    <View style={styles.promoTag}>
                      <Text style={styles.promoTagText}>
                        {tierConfig.emoji} {tTier(tierConfig.id)} · {days}{t('days_remaining')}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.eventItemSub}>{t('no_promo')}</Text>
                  )}
                </View>
                <View style={styles.eventItemActions}>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => setShareEvent(ev)}
                  >
                    <Text style={styles.shareBtnText}>↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.goToEventBtn}
                    onPress={() => navigation.navigate('Entretenimento', { eventId: ev.id })}
                  >
                    <Text style={styles.goToEventText}>📍 {t('view')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.promoteBtn, isPromoted && styles.promoteBtnActive]}
                    onPress={() => { setSelectedEventForPromo(ev); setPromoteModalVisible(true); }}
                  >
                    <Text style={[styles.promoteBtnText, isPromoted && styles.promoteBtnTextActive]}>
                      {isPromoted ? `⚙️ ${t('manage')}` : `🚀 ${t('promote')}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Eventos Favoritos ────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.favHeader}
          onPress={() => setFavExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>⭐ Eventos Salvos</Text>
          <View style={styles.favBadgeRow}>
            {favorites.length > 0 && (
              <View style={styles.favCountBadge}>
                <Text style={styles.favCountText}>{favorites.length}</Text>
              </View>
            )}
            <Text style={styles.favChevron}>{favExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {favExpanded && (
          favLoading ? (
            <ActivityIndicator color="#E53935" style={{ marginVertical: 12 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.favEmpty}>
              <Text style={styles.favEmptyEmoji}>☆</Text>
              <Text style={styles.favEmptyText}>
                Nenhum evento salvo ainda.{'\n'}Toque em ☆ num evento para salvá-lo.
              </Text>
            </View>
          ) : (
            favorites.map((fav: FavoriteEvent) => (
              <View key={fav.eventId} style={styles.favItem}>
                <View style={styles.favItemEmoji}>
                  <Text style={styles.favEmoji}>{fav.emoji}</Text>
                </View>
                <View style={styles.favItemInfo}>
                  <Text style={styles.favItemTitle} numberOfLines={1}>{fav.title}</Text>
                  <Text style={styles.favItemType}>
                    {fav.eventType === 'entertainment' ? '🎉 Entretenimento' : '🚦 Trânsito'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.favRemoveBtn}
                  onPress={() => toggleFav({
                    eventId: fav.eventId,
                    eventType: fav.eventType,
                    title: fav.title,
                    emoji: fav.emoji,
                  })}
                >
                  <Text style={styles.favRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </View>

      {/* Doação */}
      <TouchableOpacity style={styles.donateBtn} onPress={() => setDonateVisible(true)}>
        <Text style={styles.donateBtnEmoji}>💛</Text>
        <View style={styles.donateBtnTexts}>
          <Text style={styles.donateBtnTitle}>{t('support_title')}</Text>
          <Text style={styles.donateBtnSub}>{t('support_desc')}</Text>
        </View>
        <Text style={styles.donateBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Idioma */}
      <LanguagePicker />

      {/* Sair */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('profile_sign_out')}</Text>
      </TouchableOpacity>

      <MercadoPagoModal visible={donateVisible} onClose={() => setDonateVisible(false)} />

      {/* Compartilhar evento */}
      {shareEvent && (
        <ShareSheet
          visible={!!shareEvent}
          onClose={() => setShareEvent(null)}
          title={shareEvent.title}
          description={shareEvent.description}
          category={`${ENTERTAINMENT_CATEGORIES[shareEvent.category]?.emoji ?? '🎉'} ${tEntCat(shareEvent.category)}`}
          location={[shareEvent.cityName, shareEvent.stateUF].filter(Boolean).join(' — ')}
          eventId={shareEvent.id}
          eventType="entertainment"
        />
      )}

      {/* Modais de promoção */}
      {selectedEventForPromo && (
        <PromoteEventModal
          visible={promoteModalVisible}
          event={selectedEventForPromo}
          userCredits={userCredits}
          isAdmin={isAdmin}
          onClose={() => { setPromoteModalVisible(false); setSelectedEventForPromo(null); }}
          onPromoted={() => {
            setPromoteModalVisible(false);
            setSelectedEventForPromo(null);
            loadCredits();
          }}
          onCreditsUpdated={(newCredits) => setUserCredits(newCredits)}
        />
      )}

      <BuyCreditsScreen
        visible={buyCreditsVisible}
        onClose={() => setBuyCreditsVisible(false)}
        onPurchased={(credits) => {
          setUserCredits((prev) => prev + credits);
          setBuyCreditsVisible(false);
        }}
      />

      {/* Modal editar nome */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile_edit_name')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('profile_edit_name_placeholder')}
              placeholderTextColor="#bbb"
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditVisible(false)}>
                <Text style={styles.modalCancelText}>{t('filter_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, (!newName.trim() || saving) && styles.modalSaveDisabled]}
                onPress={handleSaveName}
                disabled={!newName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalSaveText}>{t('profile_save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 48 },

  // ─── Anônimo ───────────────────────────────────────────────────────────────
  anonCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 16,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  anonEmoji: { fontSize: 56, marginBottom: 12 },
  anonTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  anonDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  createBtn: {
    width: '100%', backgroundColor: '#E53935', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
    elevation: 2, shadowColor: '#E53935', shadowOpacity: 0.3, shadowRadius: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  loginBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#E53935',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 24,
  },
  loginBtnText: { color: '#E53935', fontSize: 15, fontWeight: '700' },

  divider: { width: '100%', height: 1, backgroundColor: '#f0f0f0', marginBottom: 24 },

  anonRanks: { width: '100%', marginBottom: 20 },
  anonPoints: { width: '100%' },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },

  // ─── Autenticado ───────────────────────────────────────────────────────────
  avatarSection: { alignItems: 'center', marginBottom: 20, gap: 6 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 40 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    elevation: 3,
  },
  avatarEditIcon: { fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  displayName: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  editIcon: { fontSize: 16 },
  subInfo: { fontSize: 13, color: '#888' },
  memberSince: { fontSize: 12, color: '#aaa', marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  points: { fontSize: 42, fontWeight: '900', textAlign: 'center', marginBottom: 12 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 2 },

  pointsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  pointsLabel: { fontSize: 13, color: '#444', flex: 1 },
  pointsValue: { fontSize: 13, fontWeight: '700', marginLeft: 8 },

  adminBadge: {
    backgroundColor: '#1a1a1a', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 2,
  },
  adminBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  signOutBtn: {
    borderWidth: 1.5, borderColor: '#E53935', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  signOutText: { color: '#E53935', fontSize: 15, fontWeight: '700' },

  // ─── Doação ────────────────────────────────────────────────────────────────
  donateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#FFD54F',
    shadowColor: '#FFC107', shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
  },
  donateBtnEmoji: { fontSize: 28, marginRight: 12 },
  donateBtnTexts: { flex: 1 },
  donateBtnTitle: { fontSize: 15, fontWeight: '800', color: '#5D4037' },
  donateBtnSub: { fontSize: 12, color: '#8D6E63', marginTop: 2 },
  donateBtnArrow: { fontSize: 24, color: '#FFC107', fontWeight: '700' },


  // ─── Modal editar nome ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1a1a1a', marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#888' },
  modalSave: {
    flex: 1, paddingVertical: 13, borderRadius: 11,
    backgroundColor: '#E53935', alignItems: 'center',
  },
  modalSaveDisabled: { backgroundColor: '#ccc' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // ─── Créditos ─────────────────────────────────────────────────────────────
  creditsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#FFD54F',
    shadowColor: '#FFC107', shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  creditsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  creditsEmoji: { fontSize: 32 },
  creditsCount: { fontSize: 28, fontWeight: '900', color: '#5D4037' },
  creditsLabel: { fontSize: 12, color: '#8D6E63', marginTop: 1 },
  buyCreditsBtn: {
    backgroundColor: '#FF5722', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  buyCreditsText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // ─── Favoritos ────────────────────────────────────────────────────────────
  favHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  favBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favCountBadge: {
    backgroundColor: '#E53935', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 22, alignItems: 'center',
  },
  favCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  favChevron: { fontSize: 11, color: '#aaa', fontWeight: '700' },
  favEmpty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  favEmptyEmoji: { fontSize: 36, color: '#ddd' },
  favEmptyText: { fontSize: 13, color: '#bbb', textAlign: 'center', lineHeight: 20 },
  favItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  favItemEmoji: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  favEmoji: { fontSize: 20 },
  favItemInfo: { flex: 1 },
  favItemTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  favItemType: { fontSize: 11, color: '#aaa', marginTop: 2 },
  favRemoveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  favRemoveText: { fontSize: 12, color: '#E53935', fontWeight: '800' },

  // ─── Meus Eventos ─────────────────────────────────────────────────────────
  noEventsText: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  eventItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8,
  },
  eventItemLeft: { flex: 1 },
  eventItemTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  eventItemSub: { fontSize: 12, color: '#bbb', marginTop: 2 },
  eventItemActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  goToEventBtn: {
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#1565C0', backgroundColor: '#E3F2FD',
  },
  goToEventText: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  promoTag: {
    marginTop: 3, alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FFCC80',
  },
  promoTagText: { fontSize: 11, fontWeight: '700', color: '#E65100' },
  shareBtn: {
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#64748B', backgroundColor: '#F8FAFC',
  },
  shareBtnText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  promoteBtn: {
    borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#E53935',
  },
  promoteBtnActive: { borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  promoteBtnText: { fontSize: 12, fontWeight: '700', color: '#E53935' },
  promoteBtnTextActive: { color: '#E65100' },
});
