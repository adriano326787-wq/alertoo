import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { RoadEvent, EVENT_CATEGORIES } from '../types';
import { timeAgo, timeLeft } from '../utils/time';
import { useEventsStore } from '../store/eventsStore';
import { useT } from '../hooks/useT';
import { tRoadCat } from '../utils/i18n';

interface Props {
  events: RoadEvent[];
  onClose: () => void;
  onNavigate: (event: RoadEvent) => void;
}

function FeedCard({ event, onNavigate }: { event: RoadEvent; onNavigate: (e: RoadEvent) => void }) {
  const t = useT();
  const meta = EVENT_CATEGORIES[event.category];
  const confirmEvent = useEventsStore((s) => s.confirmEvent);
  const denyEvent = useEventsStore((s) => s.denyEvent);

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: meta.color }]} onPress={() => onNavigate(event)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{meta.emoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Text style={styles.cardTime}>{timeAgo(event.createdAt)}</Text>
        </View>
        <View style={styles.navHint}>
          <Text style={styles.navHintText}>📍 {t('view')}</Text>
        </View>
      </View>

      {event.description ? <Text style={styles.cardDesc}>{event.description}</Text> : null}

      {(event.cityName || event.stateUF) && (
        <Text style={styles.cardLocation}>
          📌 {[event.cityName, event.stateUF].filter(Boolean).join(' — ')}
        </Text>
      )}

      <Text style={styles.cardExpiry}>{timeLeft(event.expiresAt)}</Text>

      <View style={styles.voteRow}>
        <TouchableOpacity
          style={styles.voteBtn}
          onPress={(e) => { e.stopPropagation?.(); confirmEvent(event.id); }}
        >
          <Text style={styles.voteBtnText}>✓ {t('road_confirm')} ({event.confirmations})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.voteBtn, styles.denyVoteBtn]}
          onPress={(e) => { e.stopPropagation?.(); denyEvent(event.id); }}
        >
          <Text style={[styles.voteBtnText, styles.denyVoteBtnText]}>✗ {t('road_deny')} ({event.denials})</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function LiveFeed({ events, onClose, onNavigate }: Props) {
  const t = useT();
  const sorted = [...events].sort((a, b) => b.createdAt - a.createdAt);
  const { filterStateUF, filterCityName } = useEventsStore();

  const filterLabel = filterCityName
    ? `${filterCityName} — ${filterStateUF}`
    : filterStateUF
    ? `Estado: ${filterStateUF}`
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('live')}</Text>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('tab_events')}</Text>
          {filterLabel && (
            <Text style={styles.filterBadge}>📍 {filterLabel}</Text>
          )}
        </View>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('road_empty')}</Text>
          <Text style={styles.emptyHint}>{t('road_empty_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedCard event={item} onNavigate={onNavigate} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
    backgroundColor: '#f5f5f5', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  liveText: { fontSize: 11, fontWeight: '800', color: '#E53935', letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  filterBadge: { fontSize: 11, color: '#1565C0', fontWeight: '600', marginTop: 2 },
  closeBtn: { fontSize: 18, color: '#888', padding: 4 },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  cardTime: { fontSize: 12, color: '#888' },
  navHint: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  navHintText: { fontSize: 12, color: '#1565C0', fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#555', marginBottom: 4 },
  cardLocation: { fontSize: 12, color: '#1565C0', marginBottom: 4 },
  cardExpiry: { fontSize: 11, color: '#E53935', marginBottom: 8 },
  voteRow: { flexDirection: 'row', gap: 8 },
  voteBtn: { flex: 1, backgroundColor: '#E8F5E9', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  voteBtnText: { fontSize: 12, fontWeight: '700', color: '#43A047' },
  denyVoteBtn: { backgroundColor: '#FFEBEE' },
  denyVoteBtnText: { color: '#E53935' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#aaa', textAlign: 'center' },
});
