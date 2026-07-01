import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile, deleteUser } from 'firebase/auth';
import {
  doc, updateDoc, collection, query, where, onSnapshot, Timestamp,
  orderBy, limit, getDocs, Timestamp as FBTimestamp,
} from 'firebase/firestore';
import * as ImagePicker from '../services/safeImagePicker';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { useAppStore } from '../store/appStore';
import { getRank, POINTS } from '../types/user';
import { EVENT_CATEGORIES, FALLBACK_EVENT_META } from '../types';
import { RankBadge, RankProgressBar, AllRanksLegend } from '../components/RankBadge';
import { signOut, getCurrentUser } from '../services/authService';
import { db } from '../services/firebase';
import { useT } from '../hooks/useT';
import { tEntCat, tTier } from '../utils/i18n';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MercadoPagoModal } from '../components/MercadoPagoModal';
import { AdBanner } from '../components/AdBanner';
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
import { useEntertainmentStore } from '../store/entertainmentStore';
import { useEventsStore } from '../store/eventsStore';
import { useTick } from '../hooks/useTick';
import { computeBadges } from '../services/badgesService';
import {
  enableBackgroundTrafficAlerts,
  disableBackgroundTrafficAlerts,
  getBackgroundTrafficAlertsPreference,
  enableRadarProximityAlerts,
  disableRadarProximityAlerts,
} from '../services/backgroundLocationTask';
import { getRadarProximityAlertsPreference } from '../services/radarProximityAlert';

export function ProfileScreen() {
  const { top } = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? '#0F172A' : '#f5f5f5';
  const cardBg = isDark ? '#1E293B' : '#fff';
  const textColor = isDark ? '#F1F5F9' : '#1a1a1a';
  const subColor = isDark ? '#94A3B8' : '#888';
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

  // ─── Alertas de trânsito em segundo plano (#43-b) ─────────────────────────────
  const [bgTrafficEnabled, setBgTrafficEnabled] = useState(false);
  const [bgTrafficLoading, setBgTrafficLoading] = useState(false);
  // Divulgação em destaque exigida pelo Google Play: deve aparecer ANTES da
  // solicitação de permissão de localização em segundo plano em runtime.
  const [bgDisclosureVisible, setBgDisclosureVisible] = useState(false);

  useEffect(() => {
    getBackgroundTrafficAlertsPreference().then(setBgTrafficEnabled).catch(() => {});
  }, []);

  const proceedEnableBgTraffic = useCallback(async () => {
    setBgDisclosureVisible(false);
    setBgTrafficLoading(true);
    try {
      const result = await enableBackgroundTrafficAlerts();
      if (result === 'granted') {
        setBgTrafficEnabled(true);
      } else if (result === 'foreground_only') {
        setBgTrafficEnabled(false);
        Alert.alert(t('bg_traffic_setting_title'), t('bg_traffic_foreground_only'));
      } else {
        setBgTrafficEnabled(false);
        Alert.alert(t('bg_traffic_setting_title'), t('bg_traffic_permission_denied'));
      }
    } finally {
      setBgTrafficLoading(false);
    }
  }, [t]);

  const handleToggleBgTraffic = useCallback(async (value: boolean) => {
    if (value) {
      setBgDisclosureVisible(true);
      return;
    }
    setBgTrafficLoading(true);
    try {
      await disableBackgroundTrafficAlerts();
      setBgTrafficEnabled(false);
    } finally {
      setBgTrafficLoading(false);
    }
  }, []);

  // ─── Aviso de proximidade de radar (voz + beep) ────────────────────────────────
  const [radarAlertEnabled, setRadarAlertEnabled] = useState(false);
  const [radarAlertLoading, setRadarAlertLoading] = useState(false);
  const [radarDisclosureVisible, setRadarDisclosureVisible] = useState(false);

  useEffect(() => {
    getRadarProximityAlertsPreference().then(setRadarAlertEnabled).catch(() => {});
  }, []);

  const proceedEnableRadarAlert = useCallback(async () => {
    setRadarDisclosureVisible(false);
    setRadarAlertLoading(true);
    try {
      const result = await enableRadarProximityAlerts();
      if (result === 'granted') {
        setRadarAlertEnabled(true);
      } else if (result === 'foreground_only') {
        setRadarAlertEnabled(false);
        Alert.alert(t('radar_alert_setting_title'), t('bg_traffic_foreground_only'));
      } else {
        setRadarAlertEnabled(false);
        Alert.alert(t('radar_alert_setting_title'), t('bg_traffic_permission_denied'));
      }
    } finally {
      setRadarAlertLoading(false);
    }
  }, [t]);

  const handleToggleRadarAlert = useCallback(async (value: boolean) => {
    if (value) {
      setRadarDisclosureVisible(true);
      return;
    }
    setRadarAlertLoading(true);
    try {
      await disableRadarProximityAlerts();
      setRadarAlertEnabled(false);
    } finally {
      setRadarAlertLoading(false);
    }
  }, []);

  // ─── Lembrete diário de blitz/lei seca (notificação de engajamento) ────────────
  const [engagementNotifEnabled, setEngagementNotifEnabled] = useState(true);

  useEffect(() => {
    setEngagementNotifEnabled(profile?.notifPrefs?.engagementReminders !== false);
  }, [profile?.notifPrefs?.engagementReminders]);

  const handleToggleEngagementNotif = useCallback(async (value: boolean) => {
    setEngagementNotifEnabled(value);
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'notifPrefs.engagementReminders': value,
      });
    } catch (_) {}
  }, [currentUser]);

  // ─── Atualizações de engajamento dos eventos criados pelo usuário ──────────
  const [eventEngagementNotifEnabled, setEventEngagementNotifEnabled] = useState(true);

  useEffect(() => {
    setEventEngagementNotifEnabled(profile?.notifPrefs?.eventEngagementUpdates !== false);
  }, [profile?.notifPrefs?.eventEngagementUpdates]);

  const handleToggleEventEngagementNotif = useCallback(async (value: boolean) => {
    setEventEngagementNotifEnabled(value);
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'notifPrefs.eventEngagementUpdates': value,
      });
    } catch (_) {}
  }, [currentUser]);

  // ─── Alerta de lei seca criada por outros usuários por perto (5km) ────────
  const [nearbyDrunkcheckNotifEnabled, setNearbyDrunkcheckNotifEnabled] = useState(true);

  useEffect(() => {
    setNearbyDrunkcheckNotifEnabled(profile?.notifPrefs?.nearbyDrunkcheckAlerts !== false);
  }, [profile?.notifPrefs?.nearbyDrunkcheckAlerts]);

  const handleToggleNearbyDrunkcheckNotif = useCallback(async (value: boolean) => {
    setNearbyDrunkcheckNotifEnabled(value);
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'notifPrefs.nearbyDrunkcheckAlerts': value,
      });
    } catch (_) {}
  }, [currentUser]);

  // ─── Promoção ────────────────────────────────────────────────────────────────
  // #8 — credits come from the real-time profile snapshot; no separate fetch needed
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

  // ─── Histórico de eventos (inclui expirados) ─────────────────────────────────
  const [historyRoad, setHistoryRoad] = useState<Array<{id:string;title:string;emoji:string;confirmations:number;createdAt:number}>>([]);
  const [historyEnt, setHistoryEnt] = useState<Array<{id:string;title:string;emoji:string;likes:number;createdAt:number}>>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous || !historyExpanded) return;
    // Evita re-fetch ao fechar e reabrir a seção de histórico
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    setHistoryLoading(true);
    const loadHistory = async () => {
      try {
        const [roadSnap, entSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'events'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(20),
          )),
          getDocs(query(
            collection(db, 'entertainment_events'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(20),
          )),
        ]);
        const { EVENT_CATEGORIES } = await import('../types');
        const { ENTERTAINMENT_CATEGORIES } = await import('../types/entertainment');
        setHistoryRoad(roadSnap.docs.map((d) => {
          const data = d.data();
          const meta = EVENT_CATEGORIES[data.category as keyof typeof EVENT_CATEGORIES] ?? FALLBACK_EVENT_META;
          return {
            id: d.id,
            title: data.title,
            emoji: meta?.emoji ?? '🚨',
            confirmations: data.confirmations ?? 0,
            createdAt: (data.createdAt as FBTimestamp)?.toMillis?.() ?? 0,
          };
        }));
        setHistoryEnt(entSnap.docs.map((d) => {
          const data = d.data();
          const meta = ENTERTAINMENT_CATEGORIES[data.category as keyof typeof ENTERTAINMENT_CATEGORIES];
          return {
            id: d.id,
            title: data.title,
            emoji: meta?.emoji ?? '🎉',
            likes: Array.isArray(data.likes) ? data.likes.length : 0,
            createdAt: (data.createdAt as FBTimestamp)?.toMillis?.() ?? 0,
          };
        }));
      } catch {
        // Falha ao carregar histórico (ex: índice ainda não disponível para
        // usuários novos) não deve assustar o usuário com um popup de erro —
        // a seção simplesmente mostra "Nenhum evento encontrado".
        if (__DEV__) console.warn('[ProfileScreen] loadHistory failed');
        setHistoryRoad([]);
        setHistoryEnt([]);
      }
      setHistoryLoading(false);
    };
    loadHistory();
  }, [historyExpanded, currentUser]);

  // ─── Favoritos ───────────────────────────────────────────────────────────────
  const favorites = useFavoritesStore((s) => s.favorites);
  const favLoading = useFavoritesStore((s) => s.loading);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const [favExpanded, setFavExpanded] = useState(true);

  // Para resolver coordenadas ao navegar para evento favorito
  const entertainmentEvents = useEntertainmentStore((s) => s.events);
  const roadEvents = useEventsStore((s) => s.events);

  // #21/#10 — useTick keeps `expiresAt > Date.now()` filter fresh every minute
  // so expired road events disappear without a full page reload
  useTick(60_000);
  const userRoadEvents = currentUser
    ? roadEvents.filter((e) => e.userId === currentUser.uid && e.expiresAt > Date.now())
    : [];
  const focusOnMap = useAppStore((s) => s.focusOnMap);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

  // ─── Excluir evento próprio (Perfil) ──────────────────────────────────────
  const deleteRoadEvent = useEventsStore((s) => s.deleteEvent);
  const deleteEntertainmentEvent = useEntertainmentStore((s) => s.deleteEntertainmentEvent);

  const handleDeleteRoadEvent = useCallback((id: string, title: string) => {
    Alert.alert(
      t('delete_event_confirm_title'),
      t('delete_event_confirm_msg').replace('{title}', title),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: () => { deleteRoadEvent(id).catch(() => {}); },
        },
      ]
    );
  }, [t, deleteRoadEvent]);

  const handleDeleteEntertainmentEvent = useCallback((id: string, title: string) => {
    Alert.alert(
      t('delete_event_confirm_title'),
      t('delete_event_confirm_msg').replace('{title}', title),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: () => { deleteEntertainmentEvent(id).catch(() => {}); },
        },
      ]
    );
  }, [t, deleteEntertainmentEvent]);

  // Carrega créditos uma vez
  const loadCredits = useCallback(async () => {
    if (!currentUser || currentUser.isAnonymous) return;
    try {
      const credits = await getUserCredits(currentUser.uid);
      setUserCredits(credits);
    } catch {}
  }, [currentUser]);

  // #8 — sync credits from real-time profile snapshot.
  // If promotionCredits arrives via the Firestore listener, use it directly.
  // Only fall back to the one-time fetch ONCE (on mount) for legacy docs that
  // were created before the promotionCredits field existed — use a ref so we
  // don't re-trigger the fetch on every snapshot where the field is still absent.
  const creditsFallbackDone = useRef(false);
  useEffect(() => {
    if (profile?.promotionCredits !== undefined) {
      setUserCredits(profile.promotionCredits);
    } else if (!creditsFallbackDone.current) {
      creditsFallbackDone.current = true;
      loadCredits().catch(() => {});
    }
  }, [profile?.promotionCredits, loadCredits]);

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
            stateUF: data.stateUF ?? undefined,    // #12
            cityName: data.cityName ?? undefined,  // #12
            countryCode: data.countryCode ?? undefined,
            isFeatured: data.isFeatured ?? false,
            promotionTier: data.promotionTier ?? null,
            promotionEndDate: data.promotionEndDate
              ? (data.promotionEndDate as Timestamp).toMillis()
              : null,
            promotionPhotoUrl: data.promotionPhotoUrl ?? null,
            promotionPhotoUrls: data.promotionPhotoUrls ?? null,
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
  // currentUser?.uid garante limpeza do listener quando o usuário faz logout
  // (evita memory leak se o componente permanece montado como tab inativa)
  }, [currentUser?.uid]);

  // ─── Foto de perfil ───────────────────────────────────────────────────────────
  const handlePickPhoto = useCallback(async () => {
    if (!currentUser) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'unavailable') {
      Alert.alert('Indisponível nesta versão', 'A seleção de fotos não está disponível nesta versão do app. Atualize o Alertoo e tente novamente.');
      return;
    }
    if (status !== 'granted') {
      Alert.alert(t('permission_required'), t('gallery_permission_msg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // #27 — valida tipo de arquivo (rejeita PDFs, vídeos, etc. que ImagePicker pode retornar)
    if (asset.type && asset.type !== 'image') {
      Alert.alert(t('invalid_type'), t('invalid_type_msg'));
      return;
    }
    // Validação de tamanho: rejeita fotos > 8 MB
    if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
      Alert.alert(t('photo_too_large'), t('photo_too_large_msg'));
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(currentUser.uid, asset.uri);
      await updateProfile(currentUser, { photoURL: url });
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
      useUserStore.getState().updatePhotoURL(url);
    } catch {
      Alert.alert(t('error'), t('photo_save_error'));
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

  // #25 — LGPD/GDPR: apaga a conta Firebase do usuário
  async function handleDeleteAccount() {
    const user = getCurrentUser();
    if (!user || user.isAnonymous) return;
    Alert.alert(
      t('delete_account_title'),
      t('delete_account_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete_account_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user);
              clearProfile();
            } catch (err: any) {
              if (err?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  t('reauth_required'),
                  t('reauth_required_msg') + '\n\nFaça logout e login novamente para confirmar sua identidade.',
                  [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: 'Sair agora',
                      onPress: async () => {
                        await signOut();
                        setPendingAuthTab('login');
                        navigation.navigate('Perfil');
                      },
                    },
                  ]
                );
              } else {
                // Mapeia erros técnicos do Firebase para mensagens amigáveis
              const firebaseMsg = err?.code ?? err?.message ?? '';
              const friendlyMsg = firebaseMsg.includes('requires-recent-login')
                ? 'Faça login novamente para excluir sua conta.'
                : firebaseMsg.includes('too-many-requests') || firebaseMsg.includes('TOO_MANY_REQUESTS')
                  ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
                  : firebaseMsg.includes('network')
                    ? 'Sem conexão. Verifique sua internet e tente novamente.'
                    : t('delete_account_msg') || 'Não foi possível excluir a conta.';
              Alert.alert(t('error'), friendlyMsg);
              }
            }
          },
        },
      ]
    );
  }

  // ─── Ações nos eventos salvos ─────────────────────────────────────────────
  function handleFavViewEvent(fav: FavoriteEvent) {
    setPendingDeepLink({ type: fav.eventType, id: fav.eventId });
    navigation.navigate('Mapa');
  }

  function handleFavGoToEvent(fav: FavoriteEvent) {
    let lat: number | null = null;
    let lon: number | null = null;

    if (fav.eventType === 'entertainment') {
      const ev = entertainmentEvents.find((e) => e.id === fav.eventId);
      if (ev) { lat = ev.latitude; lon = ev.longitude; }
    } else {
      const ev = roadEvents.find((e) => e.id === fav.eventId);
      if (ev) { lat = ev.latitude; lon = ev.longitude; }
    }

    if (lat !== null && lon !== null) {
      focusOnMap({ lat, lon, title: fav.title, emoji: fav.emoji });
      navigation.navigate('Mapa');
    } else {
      // Evento não está no cache local — usa deep link (o mapa abre o modal e navega)
      setPendingDeepLink({ type: fav.eventType, id: fav.eventId });
      navigation.navigate('Mapa');
    }
  }

  // Redireciona para AuthScreen na aba escolhida sem precisar de navigation
  async function handleGoToAuth(tab: 'login' | 'register') {
    setPendingAuthTab(tab);
    await signOut();
    clearProfile();
  }

  async function handleSaveName() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2 || !currentUser) {
      if (trimmed.length < 2) Alert.alert(t('invalid_name'), t('invalid_name_msg'));
      return;
    }
    // #26 — Skip write if name hasn't changed; show brief toast so user knows nothing was saved
    if (trimmed === profile?.displayName) {
      Alert.alert('', t('name_unchanged') || 'Nome não alterado.', [{ text: 'OK' }]);
      setEditVisible(false);
      return;
    }
    setSaving(true);
    try {
      await updateProfile(currentUser, { displayName: trimmed });
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName: trimmed });
      updateDisplayName(trimmed);
      setEditVisible(false);
    } catch {
      Alert.alert(t('error'), t('name_save_error'));
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

  // computeBadges memoizado — recalcula só quando estatísticas relevantes mudam
  const badges = useMemo(() => computeBadges({
    eventsReported: profile.eventsReported ?? 0,
    commentsPosted: profile.commentsPosted ?? 0,
    points: profile.points ?? 0,
    favoritesCount: favorites.length,
    longestStreak: profile.longestStreak ?? 0,
  }), [profile.eventsReported, profile.commentsPosted, profile.points, favorites.length, profile.longestStreak]);

  // Memoizado — recalcula apenas quando createdAt muda
  const memberSince = useMemo(() => {
    if (!profile.createdAt) return null;
    const d = new Date(profile.createdAt);
    if (isNaN(d.getTime())) return null;
    try { return format(d, "MMMM 'de' yyyy", { locale: ptBR }); }
    catch (e) {
      if (__DEV__) console.warn('[ProfileScreen] date format error, createdAt =', profile.createdAt, e);
      return null;
    }
  }, [profile.createdAt]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={[styles.scroll, { paddingTop: top + 16 }]}
      showsVerticalScrollIndicator={false}
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
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.cardTitle, { color: subColor }]}>{t('profile_points_title')}</Text>
        <Text style={[styles.points, { color: rank.color }]}>{profile.points} pts</Text>
        <RankProgressBar points={profile.points} />
      </View>

      {/* Streak diário */}
      {(profile.currentStreak ?? 0) > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: subColor }]}>🔥 Sequência de dias ativos</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>{profile.currentStreak}</Text>
            <Text style={[styles.streakUnit, { color: subColor }]}>
              {profile.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
            </Text>
          </View>
          {(profile.longestStreak ?? 0) > (profile.currentStreak ?? 0) && (
            <Text style={[styles.streakRecord, { color: subColor }]}>
              Seu recorde: {profile.longestStreak} dias
            </Text>
          )}
        </View>
      )}

      {/* ── Conquistas / Badges ─────────────────────────────────────────────── */}
      {(() => {
        const unlocked = badges.filter((b) => b.unlocked);
        const locked = badges.filter((b) => !b.unlocked);
        return (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: subColor }]}>
              🏅 Conquistas ({unlocked.length}/{badges.length})
            </Text>
            <View style={styles.badgesGrid}>
              {unlocked.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.badgeChip}
                  onPress={() => Alert.alert(`${b.emoji} ${b.label}`, b.description)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                  <Text style={styles.badgeLabel}>{b.label}</Text>
                </TouchableOpacity>
              ))}
              {locked.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.badgeChip, styles.badgeLocked]}
                  onPress={() => Alert.alert(`🔒 ${b.label}`, b.description)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.badgeEmoji, { opacity: 0.3 }]}>{b.emoji}</Text>
                  <Text style={[styles.badgeLabel, { color: '#ccc' }]}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })()}

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

      {/* ── Histórico de Eventos ─────────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={styles.favHeader}
          onPress={() => setHistoryExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardTitle, { color: subColor, marginBottom: 0 }]}>
            📋 Histórico de Eventos
          </Text>
          <Text style={styles.favChevron}>{historyExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {historyExpanded && (
          historyLoading ? (
            <ActivityIndicator color="#E53935" style={{ marginVertical: 12 }} />
          ) : (historyRoad.length === 0 && historyEnt.length === 0) ? (
            <Text style={styles.noEventsText}>Nenhum evento encontrado.</Text>
          ) : (
            <>
              {historyRoad.length > 0 && (
                <>
                  <Text style={styles.eventsSubLabel}>🚨 Alertas de trânsito</Text>
                  {historyRoad.map((ev) => (
                    <View key={ev.id} style={styles.historyItem}>
                      <Text style={styles.historyEmoji}>{ev.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventItemTitle, { color: textColor }]} numberOfLines={1}>{ev.title}</Text>
                        <Text style={styles.eventItemSub}>{format(new Date(ev.createdAt), "dd/MM/yyyy", { locale: ptBR })}</Text>
                      </View>
                      <View style={styles.historyStats}>
                        <Text style={styles.historyStatText}>✓ {ev.confirmations}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
              {historyEnt.length > 0 && (
                <>
                  <Text style={styles.eventsSubLabel}>🎉 Entretenimento</Text>
                  {historyEnt.map((ev) => (
                    <View key={ev.id} style={styles.historyItem}>
                      <Text style={styles.historyEmoji}>{ev.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventItemTitle, { color: textColor }]} numberOfLines={1}>{ev.title}</Text>
                        <Text style={styles.eventItemSub}>{format(new Date(ev.createdAt), "dd/MM/yyyy", { locale: ptBR })}</Text>
                      </View>
                      <View style={styles.historyStats}>
                        <Text style={styles.historyStatText}>❤️ {ev.likes}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )
        )}
      </View>

      {/* Como ganhar pontos */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.cardTitle, { color: subColor }]}>{t('profile_how_to_earn_short')}</Text>
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
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.cardTitle, { color: subColor }]}>{t('profile_all_ranks')}</Text>
        <AllRanksLegend />
      </View>

      {/* ── Widget de Créditos ───────────────────────────────────────────────── */}
      <View style={styles.creditsCard}>
        <View style={styles.creditsLeft}>
          <Text style={styles.creditsEmoji}>🪙</Text>
          <View>
            <Text style={styles.creditsCount}>{isAdmin ? '∞' : userCredits}</Text>
            <Text style={styles.creditsLabel}>{isAdmin ? t('credits_unlimited_admin') : userCredits === 1 ? t('credits_label_one') : t('credits_label_other')}</Text>
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

        {/* #39 — Alertas de estrada do usuário */}
        {userRoadEvents.length > 0 && (
          <>
            <Text style={styles.eventsSubLabel}>🚨 {t('road_events_title') || 'Alertas de estrada'}</Text>
            {userRoadEvents.map((ev) => {
              const meta = (EVENT_CATEGORIES as any)[ev.category];
              return (
                <View key={ev.id} style={styles.eventItem}>
                  <View style={styles.eventItemLeft}>
                    <Text style={styles.eventItemTitle} numberOfLines={1}>
                      {meta?.emoji ?? '🚨'} {ev.title}
                    </Text>
                    <Text style={styles.eventItemSub}>
                      {ev.cityName ? `${ev.cityName} · ` : ''}{t('no_promo')}
                    </Text>
                  </View>
                  <View style={styles.eventItemActions}>
                    <TouchableOpacity
                      style={styles.goToEventBtn}
                      onPress={() => {
                        focusOnMap({ lat: ev.latitude, lon: ev.longitude, title: ev.title });
                        navigation.navigate('Mapa');
                      }}
                    >
                      <Text style={styles.goToEventText}>📍 {t('view')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteEventBtn}
                      onPress={() => handleDeleteRoadEvent(ev.id, ev.title)}
                    >
                      <Text style={styles.deleteEventBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {userEvents.length > 0 && (
          <Text style={styles.eventsSubLabel}>🎉 {t('ent_title')}</Text>
        )}

        {/* #25 — loading primeiro; só mostra "vazio" depois de confirmar que não há eventos */}
        {loadingEvents ? (
          <ActivityIndicator color="#E53935" style={{ marginVertical: 16 }} />
        ) : userEvents.length === 0 && userRoadEvents.length === 0 ? (
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
                  <TouchableOpacity
                    style={styles.deleteEventBtn}
                    onPress={() => handleDeleteEntertainmentEvent(ev.id, ev.title)}
                  >
                    <Text style={styles.deleteEventBtnText}>🗑️</Text>
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
          {/* #32 — remove bottom margin when section is collapsed to avoid excess space */}
          <Text style={[styles.cardTitle, !favExpanded && { marginBottom: 0 }]}>⭐ {t('saved_events')}</Text>
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
              <Text style={styles.favEmptyText}>{t('fav_empty')}</Text>
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
                    {fav.eventType === 'entertainment' ? t('fav_ent') : t('fav_road')}
                  </Text>
                </View>
                <View style={styles.favItemActions}>
                  <TouchableOpacity
                    style={styles.favViewBtn}
                    onPress={() => handleFavViewEvent(fav)}
                    accessibilityLabel={`${t('fav_view') || 'Ver'} ${fav.title}`}
                  >
                    <Text style={styles.favViewText}>👁 {t('fav_view') || 'Ver'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.favGoBtn}
                    onPress={() => handleFavGoToEvent(fav)}
                    accessibilityLabel={`${t('fav_go') || 'Ir'} ${fav.title}`}
                  >
                    <Text style={styles.favGoText}>📍 {t('fav_go') || 'Ir'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.favRemoveBtn}
                    onPress={() => {
                      Alert.alert(
                        t('fav_remove_title') || 'Remover favorito',
                        `${t('fav_remove_msg') || 'Remover'} "${fav.title}"?`,
                        [
                          { text: t('filter_cancel') || 'Cancelar', style: 'cancel' },
                          {
                            text: t('remove') || 'Remover',
                            style: 'destructive',
                            onPress: () => toggleFav({
                              eventId: fav.eventId,
                              eventType: fav.eventType,
                              title: fav.title,
                              emoji: fav.emoji,
                            }),
                          },
                        ]
                      );
                    }}
                    accessibilityLabel={`Remover ${fav.title} dos favoritos`}
                  >
                    <Text style={styles.favRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </View>

      {/* Compartilhar rank (#11) */}
      <TouchableOpacity
        style={styles.shareRankBtn}
        onPress={() => {
          const rankText = `${rank.emoji} Sou ${rank.label} no Alertoo com ${profile.points} pts!\nBaixe o app: https://play.google.com/store/apps/details?id=com.alertoo.app`;
          import('react-native').then(({ Share }) => {
            Share.share({ message: rankText, title: 'Meu rank no Alertoo' }).catch(() => {});
          });
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.shareRankEmoji}>{rank.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareRankTitle}>{t('share_rank_title') || 'Compartilhar meu rank'}</Text>
          <Text style={styles.shareRankSub}>{rank.label} · {profile.points} pts</Text>
        </View>
        <Text style={{ fontSize: 18, color: '#64748B' }}>↗</Text>
      </TouchableOpacity>

      {/* Doação */}
      <TouchableOpacity style={styles.donateBtn} onPress={() => setDonateVisible(true)}>
        <Text style={styles.donateBtnEmoji}>💛</Text>
        <View style={styles.donateBtnTexts}>
          <Text style={styles.donateBtnTitle}>{t('support_title')}</Text>
          <Text style={styles.donateBtnSub}>{t('support_desc')}</Text>
        </View>
        <Text style={styles.donateBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Alertas de trânsito em segundo plano (#43-b) */}
      <View style={[styles.bgTrafficCard, { backgroundColor: cardBg }]}>
        <Text style={styles.bgTrafficEmoji}>🛰️</Text>
        <View style={styles.bgTrafficTexts}>
          <Text style={[styles.bgTrafficTitle, { color: textColor }]}>{t('bg_traffic_setting_title')}</Text>
          <Text style={[styles.bgTrafficSub, { color: subColor }]}>{t('bg_traffic_setting_desc')}</Text>
        </View>
        {bgTrafficLoading ? (
          <ActivityIndicator size="small" color="#FF5722" />
        ) : (
          <Switch
            value={bgTrafficEnabled}
            onValueChange={handleToggleBgTraffic}
            trackColor={{ false: '#CBD5E1', true: '#FF8A65' }}
            thumbColor={bgTrafficEnabled ? '#FF5722' : '#f4f3f4'}
          />
        )}
      </View>

      {/* Aviso de proximidade de radar (voz + beep) */}
      <View style={[styles.bgTrafficCard, { backgroundColor: cardBg }]}>
        <Text style={styles.bgTrafficEmoji}>🔊</Text>
        <View style={styles.bgTrafficTexts}>
          <Text style={[styles.bgTrafficTitle, { color: textColor }]}>{t('radar_alert_setting_title')}</Text>
          <Text style={[styles.bgTrafficSub, { color: subColor }]}>{t('radar_alert_setting_desc')}</Text>
        </View>
        {radarAlertLoading ? (
          <ActivityIndicator size="small" color="#FF5722" />
        ) : (
          <Switch
            value={radarAlertEnabled}
            onValueChange={handleToggleRadarAlert}
            trackColor={{ false: '#CBD5E1', true: '#FF8A65' }}
            thumbColor={radarAlertEnabled ? '#FF5722' : '#f4f3f4'}
          />
        )}
      </View>

      {/* Lembrete diário de blitz/lei seca (notificação de engajamento) */}
      <View style={[styles.bgTrafficCard, { backgroundColor: cardBg }]}>
        <Text style={styles.bgTrafficEmoji}>🚔</Text>
        <View style={styles.bgTrafficTexts}>
          <Text style={[styles.bgTrafficTitle, { color: textColor }]}>{t('engagement_notif_title')}</Text>
          <Text style={[styles.bgTrafficSub, { color: subColor }]}>{t('engagement_notif_desc')}</Text>
        </View>
        <Switch
          value={engagementNotifEnabled}
          onValueChange={handleToggleEngagementNotif}
          trackColor={{ false: '#CBD5E1', true: '#FF8A65' }}
          thumbColor={engagementNotifEnabled ? '#FF5722' : '#f4f3f4'}
        />
      </View>

      {/* Atualizações de engajamento dos meus eventos (views/curtidas/comentários) */}
      <View style={[styles.bgTrafficCard, { backgroundColor: cardBg }]}>
        <Text style={styles.bgTrafficEmoji}>📊</Text>
        <View style={styles.bgTrafficTexts}>
          <Text style={[styles.bgTrafficTitle, { color: textColor }]}>{t('event_engagement_notif_title')}</Text>
          <Text style={[styles.bgTrafficSub, { color: subColor }]}>{t('event_engagement_notif_desc')}</Text>
        </View>
        <Switch
          value={eventEngagementNotifEnabled}
          onValueChange={handleToggleEventEngagementNotif}
          trackColor={{ false: '#CBD5E1', true: '#FF8A65' }}
          thumbColor={eventEngagementNotifEnabled ? '#FF5722' : '#f4f3f4'}
        />
      </View>

      {/* Lei seca reportada por outros usuários por perto (raio de 5km) */}
      <View style={[styles.bgTrafficCard, { backgroundColor: cardBg }]}>
        <Text style={styles.bgTrafficEmoji}>🍺</Text>
        <View style={styles.bgTrafficTexts}>
          <Text style={[styles.bgTrafficTitle, { color: textColor }]}>{t('nearby_drunkcheck_notif_title')}</Text>
          <Text style={[styles.bgTrafficSub, { color: subColor }]}>{t('nearby_drunkcheck_notif_desc')}</Text>
        </View>
        <Switch
          value={nearbyDrunkcheckNotifEnabled}
          onValueChange={handleToggleNearbyDrunkcheckNotif}
          trackColor={{ false: '#CBD5E1', true: '#FF8A65' }}
          thumbColor={nearbyDrunkcheckNotifEnabled ? '#FF5722' : '#f4f3f4'}
        />
      </View>

      {/* Idioma */}
      <LanguagePicker />

      {/* Sair */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('profile_sign_out')}</Text>
      </TouchableOpacity>

      {/* #25 — LGPD/GDPR: excluir conta (só para usuários com e-mail) */}
      {currentUser && !currentUser.isAnonymous && (
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>🗑️ {t('delete_account_btn')}</Text>
        </TouchableOpacity>
      )}

      <AdBanner />

      <MercadoPagoModal visible={donateVisible} onClose={() => setDonateVisible(false)} />

      {/* Compartilhar evento */}
      {shareEvent && (
        <ShareSheet
          visible={!!shareEvent}
          onClose={() => setShareEvent(null)}
          title={shareEvent.title}
          description={shareEvent.description}
          category={`${ENTERTAINMENT_CATEGORIES[shareEvent.category]?.emoji ?? '🎉'} ${tEntCat(shareEvent.category)}`}
          categoryColor={ENTERTAINMENT_CATEGORIES[shareEvent.category]?.color ?? '#6A1B9A'}
          location={[shareEvent.cityName, shareEvent.stateUF].filter(Boolean).join(' — ')}
          eventId={shareEvent.id}
          eventType="entertainment"
          photoUrl={shareEvent.promotionPhotoUrl || shareEvent.photoUrl}
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
            // credits update automatically via profile snapshot (#8)
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Divulgação em destaque — localização em segundo plano (Google Play) */}
      <Modal visible={bgDisclosureVisible} transparent animationType="fade" onRequestClose={() => setBgDisclosureVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureEmoji}>🛰️</Text>
            <Text style={styles.disclosureTitle}>{t('bg_traffic_disclosure_title')}</Text>
            <Text style={styles.disclosureBody}>{t('bg_traffic_disclosure_body')}</Text>
            <Text style={styles.disclosureDetail}>{t('bg_traffic_disclosure_detail')}</Text>
            <TouchableOpacity style={styles.disclosureAccept} onPress={proceedEnableBgTraffic}>
              <Text style={styles.disclosureAcceptText}>{t('bg_traffic_disclosure_accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.disclosureDecline} onPress={() => setBgDisclosureVisible(false)}>
              <Text style={styles.disclosureDeclineText}>{t('bg_traffic_disclosure_decline')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Divulgação em destaque — aviso de proximidade de radar (localização em segundo plano) */}
      <Modal visible={radarDisclosureVisible} transparent animationType="fade" onRequestClose={() => setRadarDisclosureVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureEmoji}>🔊</Text>
            <Text style={styles.disclosureTitle}>{t('radar_alert_disclosure_title')}</Text>
            <Text style={styles.disclosureBody}>{t('radar_alert_disclosure_body')}</Text>
            <Text style={styles.disclosureDetail}>{t('radar_alert_disclosure_detail')}</Text>
            <TouchableOpacity style={styles.disclosureAccept} onPress={proceedEnableRadarAlert}>
              <Text style={styles.disclosureAcceptText}>{t('bg_traffic_disclosure_accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.disclosureDecline} onPress={() => setRadarDisclosureVisible(false)}>
              <Text style={styles.disclosureDeclineText}>{t('bg_traffic_disclosure_decline')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  streakRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  streakNumber: { fontSize: 36, fontWeight: '900', color: '#FF5722' },
  streakUnit: { fontSize: 14, fontWeight: '600' },
  streakRecord: { fontSize: 12, textAlign: 'center', marginTop: 6 },

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

  // #36 — admin badge is more prominent: gradient-like dark gold background, border and icon
  adminBadge: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminBadgeText: { color: '#F59E0B', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  signOutBtn: {
    borderWidth: 1.5, borderColor: '#E53935', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  signOutText: { color: '#E53935', fontSize: 15, fontWeight: '700' },

  // #25 — delete account
  deleteAccountBtn: {
    paddingVertical: 12, alignItems: 'center', marginBottom: 24,
  },
  deleteAccountText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },

  // ─── Compartilhar rank (#11) ──────────────────────────────────────────────
  shareRankBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    gap: 12,
  },
  shareRankEmoji: { fontSize: 28 },
  shareRankTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  shareRankSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

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

  // ─── Alertas de trânsito em segundo plano (#43-b) ─────────────────────────────
  bgTrafficCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  bgTrafficEmoji: { fontSize: 26, marginRight: 12 },
  bgTrafficTexts: { flex: 1, marginRight: 8 },
  bgTrafficTitle: { fontSize: 14, fontWeight: '800' },
  bgTrafficSub: { fontSize: 12, marginTop: 3, lineHeight: 16 },

  // Divulgação em destaque (Google Play — background location)
  disclosureCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%',
    alignItems: 'center', elevation: 10,
  },
  disclosureEmoji: { fontSize: 44, marginBottom: 12 },
  disclosureTitle: { fontSize: 19, fontWeight: '900', color: '#1a1a1a', marginBottom: 12, textAlign: 'center' },
  disclosureBody: {
    fontSize: 15, color: '#333', lineHeight: 22, textAlign: 'center',
    fontWeight: '600', marginBottom: 12,
  },
  disclosureDetail: { fontSize: 13, color: '#777', lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  disclosureAccept: {
    backgroundColor: '#FF5722', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', alignSelf: 'stretch',
  },
  disclosureAcceptText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  disclosureDecline: { paddingVertical: 13, alignItems: 'center', alignSelf: 'stretch' },
  disclosureDeclineText: { fontSize: 14, fontWeight: '600', color: '#888' },


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
  // #4 — retry button quando busca de créditos falha
  creditsRetryBtn: {
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)', alignSelf: 'flex-end',
  },
  creditsRetryText: { fontSize: 12, color: '#888', fontWeight: '600' },

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
    gap: 8,
  },
  favItemEmoji: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  favEmoji: { fontSize: 20 },
  favItemInfo: { flex: 1, minWidth: 0 },
  favItemTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  favItemType: { fontSize: 11, color: '#aaa', marginTop: 2 },
  favItemActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  favViewBtn: {
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#6366F1', backgroundColor: '#EEF2FF',
  },
  favViewText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  favGoBtn: {
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#0EA5E9', backgroundColor: '#E0F2FE',
  },
  favGoText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  favRemoveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  favRemoveText: { fontSize: 12, color: '#E53935', fontWeight: '800' },

  // ─── Badges ───────────────────────────────────────────────────────────────
  badgesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4,
  },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF7ED', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#FED7AA',
  },
  badgeLocked: {
    backgroundColor: '#F8FAFC', borderColor: '#E2E8F0',
  },
  badgeEmoji: { fontSize: 16 },
  badgeLabel: { fontSize: 12, fontWeight: '700', color: '#92400E' },

  // ─── Histórico ────────────────────────────────────────────────────────────
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  historyEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  historyStats: {
    backgroundColor: '#F1F5F9', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  historyStatText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  // ─── Meus Eventos ─────────────────────────────────────────────────────────
  noEventsText: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  eventsSubLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  deleteEventBtn: {
    borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#E53935', backgroundColor: '#FFEBEE',
  },
  deleteEventBtnText: { fontSize: 13 },
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
