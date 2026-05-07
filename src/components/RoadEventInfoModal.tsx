import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { getCurrentUserId } from '../services/authService';
import { timeAgo, timeLeft } from '../utils/time';

interface Props {
  event: RoadEvent | null;
  onConfirm: (id: string) => void;
  onDeny: (id: string) => void;
  onClose: () => void;
}

export function RoadEventInfoModal({ event, onConfirm, onDeny, onClose }: Props) {
  if (!event) return null;
  const meta = EVENT_CATEGORIES[event.category];
  const myUid = getCurrentUserId();
  const alreadyVoted = event.voters.includes(myUid);
  const isOwner = event.userId === myUid;
  const blocked = alreadyVoted || isOwner;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          <View style={[styles.accent, { backgroundColor: meta.color }]} />
          <View style={styles.body}>
            <Text style={styles.title}>{meta.emoji} {event.title}</Text>
            {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}
            {(event.cityName || event.stateUF) && (
              <Text style={styles.location}>📌 {[event.cityName, event.stateUF].filter(Boolean).join(' — ')}</Text>
            )}
            <Text style={styles.time}>{timeAgo(event.createdAt)}</Text>
            <Text style={styles.expiry}>{timeLeft(event.expiresAt)}</Text>

            {alreadyVoted && (
              <View style={styles.votedBanner}>
                <Text style={styles.votedText}>✅ Você já votou neste evento</Text>
              </View>
            )}
            {isOwner && !alreadyVoted && (
              <View style={styles.ownerBanner}>
                <Text style={styles.ownerText}>📌 Este é o seu evento</Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.confirmBtn, blocked && styles.disabledBtn]}
                onPress={() => { if (!blocked) { onConfirm(event.id); onClose(); } }}
                disabled={blocked}
              >
                <Text style={[styles.btnText, blocked && styles.disabledBtnText]}>
                  ✓ Confirmar ({event.confirmations})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.denyBtn, blocked && styles.disabledBtn]}
                onPress={() => { if (!blocked) { onDeny(event.id); onClose(); } }}
                disabled={blocked}
              >
                <Text style={[styles.btnText, blocked && styles.disabledBtnText]}>
                  ✗ Negar ({event.denials})
                </Text>
              </TouchableOpacity>
            </View>
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
  title: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  desc: { fontSize: 14, color: '#555', marginBottom: 8 },
  location: { fontSize: 13, color: '#1565C0', marginBottom: 6 },
  time: { fontSize: 13, color: '#888' },
  expiry: { fontSize: 13, color: '#E53935', marginBottom: 10 },
  votedBanner: {
    backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, marginBottom: 12,
  },
  votedText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  ownerBanner: {
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, marginBottom: 12,
  },
  ownerText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#43A047' },
  denyBtn: { backgroundColor: '#E53935' },
  disabledBtn: { backgroundColor: '#eee' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabledBtnText: { color: '#bbb' },
});
