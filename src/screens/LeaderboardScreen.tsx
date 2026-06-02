/**
 * LeaderboardScreen — ranking público dos top usuários por pontos (#2).
 *
 * Carrega os top 50 usuários ordenados por pontos via Firestore.
 * Destaca o usuário logado. Atualiza ao puxar para baixo.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Image, RefreshControl, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCurrentUserId } from '../services/authService';
import { getRank, RANKS } from '../types/user';
import { useT } from '../hooks/useT';

interface LeaderEntry {
  uid: string;
  displayName: string;
  points: number;
  photoURL?: string | null;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_COUNT = 50;

export function LeaderboardScreen() {
  const t = useT();
  const { top } = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const myUid = getCurrentUserId();

  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          orderBy('points', 'desc'),
          limit(TOP_COUNT)
        )
      );
      const list: LeaderEntry[] = snap.docs.map((d) => ({
        uid: d.id,
        displayName: d.data().displayName ?? 'Usuário',
        points: d.data().points ?? 0,
        photoURL: d.data().photoURL ?? null,
      }));
      setLeaders(list);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const bg = isDark ? '#0F172A' : '#F1F5F9';
  const cardBg = isDark ? '#1E293B' : '#fff';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subColor = isDark ? '#94A3B8' : '#64748B';

  const renderItem = ({ item, index }: { item: LeaderEntry; index: number }) => {
    const rank = getRank(item.points);
    const isMe = item.uid === myUid;
    const medal = MEDALS[index] ?? null;

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: isMe ? '#FFF3E0' : cardBg },
          isMe && styles.rowMe,
        ]}
      >
        {/* Posição */}
        <View style={styles.posWrap}>
          {medal
            ? <Text style={styles.medal}>{medal}</Text>
            : <Text style={[styles.pos, { color: subColor }]}>{index + 1}</Text>}
        </View>

        {/* Avatar */}
        {item.photoURL
          ? <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: rank.color }]}>
              <Text style={styles.avatarEmoji}>{rank.emoji}</Text>
            </View>
          )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: isMe ? '#E65100' : textColor }]} numberOfLines={1}>
            {item.displayName}{isMe ? ' (você)' : ''}
          </Text>
          <Text style={[styles.rankLabel, { color: rank.color }]}>
            {rank.emoji} {rank.label}
          </Text>
        </View>

        {/* Pontos */}
        <Text style={[styles.pts, { color: rank.color }]}>{item.points} pts</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 12, backgroundColor: isDark ? '#1E293B' : '#fff' }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>🏆 {t('leaderboard_title') || 'Ranking'}</Text>
        <Text style={[styles.headerSub, { color: subColor }]}>
          {t('leaderboard_sub') || 'Top usuários por pontuação'}
        </Text>
      </View>

      {/* Legenda de ranks */}
      <View style={[styles.ranksRow, { backgroundColor: isDark ? '#1E293B' : '#fff' }]}>
        {RANKS.map((r) => (
          <View key={r.id} style={styles.rankChip}>
            <Text style={styles.rankChipEmoji}>{r.emoji}</Text>
            <Text style={[styles.rankChipLabel, { color: r.color }]}>{r.minPoints}+</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      ) : leaders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
          <Text style={[styles.emptyText, { color: subColor }]}>
            {t('leaderboard_empty') || 'Nenhum usuário no ranking ainda.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5722']} />
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 2 },

  ranksRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rankChip: { alignItems: 'center', flex: 1 },
  rankChipEmoji: { fontSize: 18 },
  rankChipLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  list: { padding: 12 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 12, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  rowMe: {
    borderWidth: 2, borderColor: '#FF9800',
  },

  posWrap: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  pos: { fontSize: 15, fontWeight: '800' },

  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 20 },

  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  rankLabel: { fontSize: 12, marginTop: 2, fontWeight: '600' },

  pts: { fontSize: 15, fontWeight: '900' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
