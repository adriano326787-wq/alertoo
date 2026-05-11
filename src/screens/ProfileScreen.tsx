import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useUserStore } from '../store/userStore';
import { useAppStore } from '../store/appStore';
import { getRank, POINTS } from '../types/user';
import { RankBadge, RankProgressBar, AllRanksLegend } from '../components/RankBadge';
import { signOut, getCurrentUser } from '../services/authService';
import { db } from '../services/firebase';
import { t } from '../utils/i18n';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MercadoPagoModal } from '../components/MercadoPagoModal';
import { PromoteEventModal } from '../components/PromoteEventModal';
import { BuyCreditsScreen } from './BuyCreditsScreen';
import { getUserCredits, daysRemaining } from '../services/promotionService';
import { PROMOTION_TIERS } from '../types/promotion';
import { EntertainmentEvent } from '../types/entertainment';

export function ProfileScreen() {
  const { top } = useSafeAreaInsets();
  const { profile, clearProfile, updateDisplayName, isAdmin } = useUserStore();
  const setPendingAuthTab = useAppStore((s) => s.setPendingAuthTab);
  useAppStore((s) => s.langVersion); // re-render on language change
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
  const [loadingEvents, setLoadingEvents] = useState(false);

  const loadCreditsAndEvents = useCallback(async () => {
    if (!currentUser || currentUser.isAnonymous) return;
    try {
      const credits = await getUserCredits(currentUser.uid);
      setUserCredits(credits);
    } catch {}

    setLoadingEvents(true);
    try {
      // Busca apenas por userId (sem índice), ordena e filtra localmente
      const snap = await getDocs(
        query(
          collection(db, 'entertainment_events'),
          where('userId', '==', currentUser.uid),
        )
      );
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
            createdAt: data.createdAt?.toMillis?.() ?? now,
            expiresAt: data.expiresAt?.toMillis?.() ?? now,
            userId: data.userId,
            likes: data.likes ?? [],
            commentCount: data.commentCount ?? 0,
            isFeatured: data.isFeatured ?? false,
            promotionTier: data.promotionTier ?? null,
            promotionEndDate: data.promotionEndDate?.toMillis?.() ?? null,
            promotionPhotoUrl: data.promotionPhotoUrl ?? null,
          } as EntertainmentEvent;
        })
        .filter((e) => e.expiresAt > now)
        .sort((a, b) => b.expiresAt - a.expiresAt); // mais recentes primeiro
      setUserEvents(events);
    } catch (err) {
      console.error('[ProfileScreen] erro ao carregar eventos:', err);
    }
    setLoadingEvents(false);
  }, [currentUser]);

  useEffect(() => {
    loadCreditsAndEvents();
  }, [loadCreditsAndEvents]);


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

          <TouchableOpacity style={[styles.donateBtn, { width: '100%' }]} onPress={() => setDonateVisible(true)}>
            <Text style={styles.donateBtnEmoji}>💛</Text>
            <View style={styles.donateBtnTexts}>
              <Text style={styles.donateBtnTitle}>Apoie o Alertoo</Text>
              <Text style={styles.donateBtnSub}>Ajude a manter a plataforma gratuita</Text>
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
        {profile.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: rank.color }]}>
            <Text style={styles.avatarEmoji}>{rank.emoji}</Text>
          </View>
        )}

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
            <Text style={styles.adminBadgeText}>⚙️ Administrador</Text>
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
            <Text style={styles.buyCreditsText}>+ Comprar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Meus Eventos Ativos ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎉 Meus Eventos Ativos</Text>
        {loadingEvents ? (
          <ActivityIndicator color="#E53935" style={{ marginVertical: 16 }} />
        ) : userEvents.length === 0 ? (
          <Text style={styles.noEventsText}>Você não tem eventos ativos no momento.</Text>
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
                        {tierConfig.emoji} {tierConfig.label} · {days}d restantes
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.eventItemSub}>Sem promoção ativa</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.promoteBtn, isPromoted && styles.promoteBtnActive]}
                  onPress={() => { setSelectedEventForPromo(ev); setPromoteModalVisible(true); }}
                >
                  <Text style={[styles.promoteBtnText, isPromoted && styles.promoteBtnTextActive]}>
                    {isPromoted ? '⚙️ Gerenciar' : '🚀 Promover'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Doação */}
      <TouchableOpacity style={styles.donateBtn} onPress={() => setDonateVisible(true)}>
        <Text style={styles.donateBtnEmoji}>💛</Text>
        <View style={styles.donateBtnTexts}>
          <Text style={styles.donateBtnTitle}>Apoie o Alertoo</Text>
          <Text style={styles.donateBtnSub}>Ajude a manter a plataforma gratuita</Text>
        </View>
        <Text style={styles.donateBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Sair */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('profile_sign_out')}</Text>
      </TouchableOpacity>

      <MercadoPagoModal visible={donateVisible} onClose={() => setDonateVisible(false)} />

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
            loadCreditsAndEvents();
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
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 4 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarEmoji: { fontSize: 40 },
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

  // ─── Meus Eventos ─────────────────────────────────────────────────────────
  noEventsText: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  eventItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8,
  },
  eventItemLeft: { flex: 1 },
  eventItemTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  eventItemSub: { fontSize: 12, color: '#bbb', marginTop: 2 },
  promoTag: {
    marginTop: 3, alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FFCC80',
  },
  promoTagText: { fontSize: 11, fontWeight: '700', color: '#E65100' },
  promoteBtn: {
    borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#E53935',
  },
  promoteBtnActive: { borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  promoteBtnText: { fontSize: 12, fontWeight: '700', color: '#E53935' },
  promoteBtnTextActive: { color: '#E65100' },
});
