/**
 * EntertainmentInfoModal — sheet inferior premium.
 *
 * Mantém o componente SEMPRE montado e controla o BottomSheetCard via
 * `visible={!!event}`, evitando que o desmonte imediato interrompa a
 * animação de saída quando o X é pressionado.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Modal, Pressable, StatusBar, Alert, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { getCurrentUserId } from '../services/authService';
import { timeAgo } from '../utils/time';
import { PROMOTION_TIERS } from '../types/promotion';
import { ShareSheet } from './ShareSheet';
import { NavigationModal } from './NavigationModal';
import { ReportModal } from './ReportModal';
import { EditEntertainmentModal } from './EditEntertainmentModal';
import { BottomSheetCard, SheetAction } from './ui/BottomSheetCard';
import { useT } from '../hooks/useT';
import { tEntCat, tTier } from '../utils/i18n';
import { palette } from '../theme/tokens';
import { useFavoritesStore } from '../store/favoritesStore';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { useUserStore } from '../store/userStore';
import { rw, rh, rf } from '../utils/responsive';

interface Props {
  event: EntertainmentEvent | null;
  onLike: (id: string) => void;
  onComment: (event: EntertainmentEvent) => void;
  onGoToMap?: (event: EntertainmentEvent) => void;
  onClose: () => void;
}

export function EntertainmentInfoModal({
  event, onLike, onComment, onGoToMap, onClose,
}: Props) {
  const t = useT();
  const [shareVisible, setShareVisible] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const incrementViewCount = useEntertainmentStore((s) => s.incrementViewCount);
  const toggleAttendance = useEntertainmentStore((s) => s.toggleAttendance);
  const submitRating = useEntertainmentStore((s) => s.submitRating);
  const deleteEntertainmentEvent = useEntertainmentStore((s) => s.deleteEntertainmentEvent);
  const isAdmin = useUserStore((s) => s.isAdmin);

  // Incrementa visualização ao abrir o modal (#8)
  // Também reseta estados de UI ao trocar de evento
  useEffect(() => {
    if (event) {
      incrementViewCount(event.id);
    }
    setRatingVisible(false);
    setReportVisible(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);
  // #20 — Zustand não re-renderiza componentes desmontados, então o toggle async
  // é seguro mesmo que o modal feche antes da Promise resolver.
  const isFavorite = useFavoritesStore((s) => event ? s.favoriteIds.has(event.id) : false);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  // Galeria de fotos: usa promotionPhotoUrls se disponível, senão cai para fotos individuais
  const allPhotos: string[] = event
    ? (event.promotionPhotoUrls && event.promotionPhotoUrls.length > 0
        ? event.promotionPhotoUrls
        : [event.promotionPhotoUrl ?? event.photoUrl].filter(Boolean) as string[])
    : [];

  // Deriva os dados do evento apenas quando disponível
  const meta = event
    ? ENTERTAINMENT_CATEGORIES[event.category] ?? { emoji: '📍', color: '#607D8B', label: event.category }
    : null;
  const myUid = getCurrentUserId() ?? '';
  const likes = event && Array.isArray(event.likes) ? event.likes : [];
  const liked = event ? likes.includes(myUid) : false;
  const isOwner = event ? event.userId === myUid : false;
  const isGoing = event ? (event.attendees ?? []).includes(myUid) : false;
  const attendeeCount = event?.attendees?.length ?? 0;
  const isPromoted = !!(event?.promotionTier && event?.promotionEndDate && event.promotionEndDate > Date.now());
  const tierConfig = isPromoted && event?.promotionTier ? PROMOTION_TIERS[event.promotionTier] : null;
  const location = event ? [event.cityName, event.stateUF].filter(Boolean).join(' — ') : '';

  // Tag superior: tier promovido OU dono do evento
  const tag = !event || !meta ? undefined :
    isPromoted && tierConfig
      ? { label: `${tierConfig.emoji} ${tTier(tierConfig.id).toUpperCase()}`, color: tierConfig.pinColor }
      : isOwner
        ? { label: `📌 ${t('own_event').toUpperCase()}`, color: palette.brand[500] }
        : undefined;

  // Overlay sobre a imagem hero (chip do tier flutuante)
  const heroOverlay = isPromoted && tierConfig ? (
    <View style={[styles.heroChip, { backgroundColor: tierConfig.pinColor }]}>
      <Text style={styles.heroChipText}>{tierConfig.emoji} {tTier(tierConfig.id).toUpperCase()}</Text>
    </View>
  ) : null;

  // ─── Adicionar ao calendário ────────────────────────────────────────────
  function handleAddToCalendar() {
    if (!event) return;
    const fmt = (ms: number) =>
      new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const start = fmt(event.createdAt);
    const end = fmt(event.expiresAt);
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description ?? '');
    const location = encodeURIComponent(event.address ?? `${event.latitude},${event.longitude}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Google Calendar.');
    });
  }

  // Quick actions — só montadas quando event existe
  const quickActions: SheetAction[] = event && meta ? [
    {
      icon: liked ? '❤️' : '🤍',
      label: `${likes.length}`,
      onPress: () => { if (!isOwner) onLike(event.id); },
      disabled: isOwner,
    },
    {
      icon: '💬',
      label: `${event.commentCount}`,
      onPress: () => { onClose(); onComment(event); },
    },
    {
      icon: isFavorite ? '⭐' : '☆',
      label: isFavorite ? t('saved') || 'Salvo' : t('save') || 'Salvar',
      onPress: () => {
        if (myUid === 'anonymous') {
          Alert.alert(t('login_required'), t('login_required_ent'));
          return;
        }
        toggleFav({
          eventId: event.id,
          eventType: 'entertainment',
          title: event.title,
          emoji: meta.emoji,
        });
      },
    },
    {
      icon: '↗',
      label: t('share'),
      onPress: () => setShareVisible(true),
    },
    // RSVP "Vou lá"
    {
      icon: isGoing ? '✅' : '🙋',
      label: isGoing
        ? `Confirmado (${attendeeCount})`
        : attendeeCount > 0
          ? `Vou lá (${attendeeCount})`
          : 'Vou lá',
      onPress: () => {
        if (myUid === 'anonymous') {
          Alert.alert('Conta necessária', 'Faça login para confirmar presença.');
          return;
        }
        toggleAttendance(event.id);
      },
    },
    // Avaliação
    {
      icon: event.avgRating ? `⭐` : '☆',
      label: event.avgRating
        ? `${event.avgRating.toFixed(1)} (${event.ratingCount})`
        : 'Avaliar',
      onPress: () => {
        if (myUid === 'anonymous') {
          Alert.alert('Conta necessária', 'Faça login para avaliar.');
          return;
        }
        setRatingVisible(true);
      },
    },
    // Calendário
    {
      icon: '📅',
      label: 'Calendário',
      onPress: handleAddToCalendar,
    },
    ...(onGoToMap ? [{
      icon: '🗺️',
      label: t('go_to_event'),
      onPress: () => { onClose(); onGoToMap(event); },
    }] : []),
    // Botão de edição — só para o dono (#3)
    ...(isOwner ? [{
      icon: '✏️',
      label: t('edit_event') || 'Editar',
      onPress: () => setEditVisible(true),
    }] : []),
    // Botão de denúncia — só aparece para quem não é dono do evento
    ...(!isOwner ? [{
      icon: '⚑',
      label: t('report_event'),
      onPress: () => setReportVisible(true),
    }] : []),
    // Exclusão — somente admin
    ...(isAdmin ? [{
      icon: '🗑️',
      label: 'Excluir evento',
      variant: 'danger' as const,
      onPress: () => {
        Alert.alert(
          '🗑️ Excluir evento',
          `Tem certeza que deseja excluir "${event.title}"? Esta ação não pode ser desfeita.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Excluir',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteEntertainmentEvent(event.id);
                  onClose();
                } catch {
                  Alert.alert('Erro', 'Não foi possível excluir o evento. Tente novamente.');
                }
              },
            },
          ]
        );
      },
    }] : []),
  ] : [];

  return (
    <>
      {/* BottomSheetCard SEMPRE montado — visible controla abertura/fechamento */}
      <BottomSheetCard
        visible={!!event}
        onClose={onClose}
        imageUrls={allPhotos.length > 0 ? allPhotos : undefined}
        imageHeight={220}
        imageOverlay={heroOverlay}
        onImagePress={(uri) => setLightboxPhoto(uri)}
        tag={tag}
        category={event && meta ? `${meta.emoji} ${tEntCat(event.category).toUpperCase()}` : ''}
        title={event?.title ?? ''}
        subtitle={location}
        meta={event ? timeAgo(event.createdAt) : ''}
        description={event?.description}
        link={
          event?.link && event.promotionTier && event.promotionEndDate && event.promotionEndDate > Date.now()
            ? event.link
            : undefined
        }
        primaryAction={event ? {
          icon: '🧭',
          label: t('navigate_gps') || 'Como chegar',
          onPress: () => setNavVisible(true),
        } : undefined}
        quickActions={quickActions}
      />

      {/* Lightbox de foto em tela cheia */}
      <Modal
        visible={!!lightboxPhoto}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setLightboxPhoto(null)}
      >
        <StatusBar hidden />
        <View style={styles.lightboxBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLightboxPhoto(null)} />
          {lightboxPhoto ? (
            <Image
              source={{ uri: lightboxPhoto }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            onPress={() => setLightboxPhoto(null)}
            hitSlop={16}
            style={({ pressed }) => [styles.lightboxClose, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.lightboxCloseText}>✕</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Sub-modais — só renderizados quando event existe */}
      {event && meta && (
        <>
          <ShareSheet
            visible={shareVisible}
            onClose={() => setShareVisible(false)}
            title={event.title}
            description={event.description}
            category={`${meta.emoji} ${tEntCat(event.category)}`}
            location={location}
            eventId={event.id}
            eventType="entertainment"
          />

          <NavigationModal
            visible={navVisible}
            destination={{ latitude: event.latitude, longitude: event.longitude }}
            destinationLabel={event.title}
            destinationEmoji={meta.emoji}
            onClose={() => setNavVisible(false)}
          />

          <ReportModal
            visible={reportVisible}
            eventId={event.id}
            eventType="entertainment"
            onClose={() => setReportVisible(false)}
          />

          <EditEntertainmentModal
            visible={editVisible}
            event={event}
            onClose={() => setEditVisible(false)}
          />
        </>
      )}

      {/* Modal de avaliação com estrelas */}
      <RatingModal
        visible={ratingVisible}
        eventTitle={event?.title ?? ''}
        currentRating={event?.avgRating ?? null}
        onSubmit={async (stars) => {
          setRatingVisible(false);
          if (event) {
            try { await submitRating(event.id, stars); } catch {}
          }
        }}
        onClose={() => setRatingVisible(false)}
      />
    </>
  );
}

// ─── Rating Modal ─────────────────────────────────────────────────────────────
function RatingModal({
  visible, eventTitle, currentRating, onSubmit, onClose,
}: {
  visible: boolean;
  eventTitle: string;
  currentRating: number | null;
  onSubmit: (stars: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) { setSelected(0); setSubmitting(false); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ratingStyles.overlay} onPress={onClose}>
        <Pressable style={ratingStyles.card} onPress={() => {}}>
          <Text style={ratingStyles.title}>Avaliar evento</Text>
          <Text style={ratingStyles.subtitle} numberOfLines={1}>{eventTitle}</Text>
          {currentRating !== null && (
            <Text style={ratingStyles.current}>Média atual: ⭐ {currentRating.toFixed(1)}</Text>
          )}
          <View style={ratingStyles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setSelected(star)} hitSlop={8}>
                <Text style={[ratingStyles.star, selected >= star && ratingStyles.starActive]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={ratingStyles.starLabel}>
            {selected === 0 ? 'Toque para selecionar' :
             selected === 1 ? '😞 Ruim' :
             selected === 2 ? '😐 Regular' :
             selected === 3 ? '😊 Bom' :
             selected === 4 ? '😄 Ótimo' : '🤩 Excelente!'}
          </Text>
          <View style={ratingStyles.btns}>
            <Pressable style={ratingStyles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={ratingStyles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[ratingStyles.submitBtn, (selected === 0 || submitting) && ratingStyles.submitDisabled]}
              onPress={async () => {
                if (selected === 0 || submitting) return;
                setSubmitting(true);
                await onSubmit(selected);
                setSubmitting(false);
              }}
              disabled={selected === 0 || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ratingStyles.submitText}>Enviar</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ratingStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: rw(24),
  },
  card: {
    backgroundColor: '#fff', borderRadius: rw(20), padding: rw(24),
    width: '100%', alignItems: 'center', gap: rh(10),
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: rf(18), fontWeight: '900', color: '#1a1a1a' },
  subtitle: { fontSize: rf(13), color: '#888', textAlign: 'center' },
  current: { fontSize: rf(12), color: '#F59E0B', fontWeight: '700' },
  stars: { flexDirection: 'row', gap: rw(8), marginVertical: rh(4) },
  star: { fontSize: rf(40), color: '#E0E0E0' },
  starActive: { color: '#F59E0B' },
  starLabel: { fontSize: rf(13), color: '#555', fontWeight: '600', minHeight: rf(20) },
  btns: { flexDirection: 'row', gap: rw(12), marginTop: rh(4), width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: rh(13), borderRadius: rw(12),
    borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center',
  },
  cancelText: { fontSize: rf(14), fontWeight: '700', color: '#888' },
  submitBtn: {
    flex: 1, paddingVertical: rh(13), borderRadius: rw(12),
    backgroundColor: '#FF5722', alignItems: 'center',
  },
  submitDisabled: { backgroundColor: '#ccc' },
  submitText: { fontSize: rf(14), fontWeight: '800', color: '#fff' },
});

const styles = StyleSheet.create({
  heroChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroChipText: {
    color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4,
  },
  // Lightbox
  lightboxBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    includeFontPadding: false,
  },
});
