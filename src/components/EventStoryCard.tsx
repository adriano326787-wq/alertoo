import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Tamanho de renderização — proporção 9:16 do Instagram Stories (1080x1920).
// O view-shot faz upscale para a resolução final na captura.
export const STORY_CARD_WIDTH = 270;
export const STORY_CARD_HEIGHT = 480;

interface Props {
  title: string;
  description?: string;
  /** Emoji + label da categoria, ex: "🎉 Festa" */
  category: string;
  categoryColor: string;
  location?: string;
  photoUrl?: string | null;
  ctaLabel: string;
}

/**
 * Card de Instagram Story (9:16) pra um evento — capturado via react-native-view-shot
 * e enviado pro Stories ou anexado ao compartilhamento nas demais redes.
 */
export const EventStoryCard = forwardRef<View, Props>(function EventStoryCard(
  { title, description, category, categoryColor, location, photoUrl, ctaLabel },
  ref,
) {
  const hasPhoto = !!photoUrl;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.card,
        !hasPhoto && { backgroundColor: categoryColor },
      ]}
    >
      {hasPhoto && (
        <Image source={{ uri: photoUrl! }} style={styles.photo} resizeMode="cover" />
      )}

      {hasPhoto && <View style={styles.overlay} />}

      <View style={styles.badgeRow}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandEmoji}>🚀</Text>
          <Text style={styles.brandText}>Alertoo</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {!!description && (
          <Text style={styles.description} numberOfLines={3}>{description}</Text>
        )}
        {!!location && <Text style={styles.location}>📍 {location}</Text>}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>👆 {ctaLabel}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    // gradiente aproximado via camadas — view-shot não suporta linear-gradient nativo
    // então usamos um bloco escuro mais forte só na parte inferior (ver bottomShade)
  },
  badgeRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  brandEmoji: { fontSize: 14 },
  brandText: { fontSize: 11, fontWeight: '800', color: '#E53935' },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  title: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, lineHeight: 24 },
  description: { fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 17, marginBottom: 8 },
  location: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#1F2937' },
});
