import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EntertainmentEvent, ENTERTAINMENT_CATEGORIES } from '../types/entertainment';
import { getCurrentUserId } from '../services/authService';
import { timeAgo } from '../utils/time';

interface Props {
  event: EntertainmentEvent | null;
  isAdmin?: boolean;
  onLike: (id: string) => void;
  onToggleFeatured?: (id: string) => void;
  onComment: (event: EntertainmentEvent) => void;
  onClose: () => void;
}

export function EntertainmentInfoModal({ event, isAdmin, onLike, onToggleFeatured, onComment, onClose }: Props) {
  if (!event) return null;
  const meta = ENTERTAINMENT_CATEGORIES[event.category];
  const myUid = getCurrentUserId();
  const liked = event.likes.includes(myUid);
  const isOwner = event.userId === myUid;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          {/* Barra colorida — dourada se em destaque */}
          <View style={[styles.accent, { backgroundColor: event.isFeatured ? '#F9A825' : meta.color }]} />
          <View style={styles.body}>

            {/* Badge de destaque */}
            {event.isFeatured && (
              <View style={styles.featuredBanner}>
                <Text style={styles.featuredBannerText}>⭐ Evento em Destaque</Text>
              </View>
            )}

            <Text style={styles.category}>{meta.emoji} {meta.label}</Text>
            <Text style={styles.title}>{event.title}</Text>
            {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}
            {event.address ? <Text style={styles.address}>📍 {event.address}</Text> : null}
            {(event.cityName || event.stateUF) && (
              <Text style={styles.location}>🗺️ {[event.cityName, event.stateUF].filter(Boolean).join(' — ')}</Text>
            )}
            <Text style={styles.time}>{timeAgo(event.createdAt)}</Text>

            {isOwner && (
              <View style={styles.ownerBanner}>
                <Text style={styles.ownerText}>📌 Este é o seu evento</Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, liked && styles.likedBtn, isOwner && styles.disabledBtn]}
                onPress={() => { if (!isOwner) { onLike(event.id); onClose(); } }}
                disabled={isOwner}
              >
                <Text style={[styles.likeText, isOwner && styles.disabledText]}>
                  {liked ? '❤️' : '🤍'} {event.likes.length} likes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.commentBtn]}
                onPress={() => { onClose(); onComment(event); }}
              >
                <Text style={styles.commentText}>💬 {event.commentCount} comentários</Text>
              </TouchableOpacity>
            </View>

            {/* Botão de destaque — visível apenas para admin */}
            {isAdmin && onToggleFeatured && (
              <TouchableOpacity
                style={[styles.adminBtn, event.isFeatured && styles.adminBtnActive]}
                onPress={() => { onToggleFeatured(event.id); onClose(); }}
              >
                <Text style={styles.adminBtnText}>
                  {event.isFeatured ? '✖ Remover destaque' : '⭐ Colocar em destaque'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '100%', overflow: 'hidden', elevation: 8 },
  accent: { height: 6 },
  body: { padding: 18 },
  category: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  desc: { fontSize: 14, color: '#555', marginBottom: 6 },
  address: { fontSize: 13, color: '#6A1B9A', marginBottom: 4 },
  location: { fontSize: 13, color: '#1565C0', marginBottom: 4 },
  time: { fontSize: 12, color: '#aaa', marginBottom: 10 },
  featuredBanner: {
    backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, marginBottom: 10, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#FFE082',
  },
  featuredBannerText: { fontSize: 13, color: '#F57F17', fontWeight: '700' },
  ownerBanner: {
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, marginBottom: 12,
  },
  ownerText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
  likedBtn: { backgroundColor: '#FCE4EC', borderColor: '#F48FB1' },
  disabledBtn: { opacity: 0.4 },
  commentBtn: { backgroundColor: '#F3E5F5', borderColor: '#CE93D8' },
  likeText: { fontSize: 13, fontWeight: '700', color: '#444' },
  disabledText: { color: '#bbb' },
  commentText: { fontSize: 13, fontWeight: '700', color: '#6A1B9A' },
  adminBtn: {
    marginTop: 12, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFD54F',
    alignItems: 'center',
  },
  adminBtnActive: {
    backgroundColor: '#FFEBEE', borderColor: '#EF9A9A',
  },
  adminBtnText: { fontSize: 13, fontWeight: '700', color: '#E65100' },
});
