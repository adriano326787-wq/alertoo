import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRank, getNextRank, RANKS } from '../types/user';
import { t } from '../utils/i18n';
import { useAppStore } from '../store/appStore';

interface Props {
  points: number;
  size?: 'small' | 'large';
}

export function RankBadge({ points, size = 'small' }: Props) {
  useAppStore((s) => s.langVersion); // re-render on language change
  const rank = getRank(points);
  const isLarge = size === 'large';

  return (
    <View style={[styles.badge, { backgroundColor: rank.color + '22', borderColor: rank.color }, isLarge && styles.badgeLarge]}>
      <Text style={[styles.emoji, isLarge && styles.emojiLarge]}>{rank.emoji}</Text>
      <Text style={[styles.label, { color: rank.color }, isLarge && styles.labelLarge]}>{t(`rank_${rank.id}`)}</Text>
    </View>
  );
}

export function RankProgressBar({ points }: { points: number }) {
  useAppStore((s) => s.langVersion); // re-render on language change
  const rank = getRank(points);
  const next = getNextRank(points);
  const prev = rank.minPoints;
  const progress = next
    ? Math.min((points - prev) / (next.minPoints - prev), 1)
    : 1;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressRank, { color: rank.color }]}>{rank.emoji} {t(`rank_${rank.id}`)}</Text>
        {next && (
          <Text style={[styles.progressRank, { color: next.color }]}>{next.emoji} {t(`rank_${next.id}`)}</Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { flex: progress, backgroundColor: rank.color }]} />
      </View>
      <Text style={styles.progressPts}>
        {next
          ? `${points} / ${next.minPoints} ${t('rank_progress')}`
          : `${points} ${t('rank_max')}`}
      </Text>
    </View>
  );
}

export function AllRanksLegend() {
  useAppStore((s) => s.langVersion); // re-render on language change
  return (
    <View style={styles.legend}>
      {RANKS.map((r) => (
        <View key={r.id} style={styles.legendRow}>
          <Text style={styles.legendEmoji}>{r.emoji}</Text>
          <View style={styles.legendInfo}>
            <Text style={[styles.legendLabel, { color: r.color }]}>{t(`rank_${r.id}`)}</Text>
            <Text style={styles.legendPts}>{r.minPoints === 0 ? t('rank_start') : `${r.minPoints}+ pts`}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  badgeLarge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  emoji: { fontSize: 14 },
  emojiLarge: { fontSize: 22 },
  label: { fontSize: 12, fontWeight: '700' },
  labelLarge: { fontSize: 17 },

  progressContainer: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressRank: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: 8, borderRadius: 4 },
  progressPts: { fontSize: 11, color: '#888', textAlign: 'center' },

  legend: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  legendInfo: { flex: 1 },
  legendLabel: { fontSize: 14, fontWeight: '700' },
  legendPts: { fontSize: 12, color: '#888' },
});
