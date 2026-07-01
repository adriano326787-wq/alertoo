/**
 * LeaderboardScreen — ranking público dos top usuários por pontos (#2).
 *
 * Carrega os top 50 usuários ordenados por pontos via Firestore.
 * Destaca o usuário logado. Atualiza ao puxar para baixo.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { AdBanner, BannerAdSize } from '../components/AdBanner';

interface LeaderEntry {
  uid: string;
  displayName: string;
  points: number;
  photoURL?: string | null;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_COUNT = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Cache em memória — sobrevive à navegação entre telas sem novo Firestore read
let _cachedLeaders: LeaderEntry[] = [];
let _cacheTimestamp = 0;

export function LeaderboardScreen() {
  const t = useT();
  const { top } = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const myUid = getCurrentUserId();

  const [leaders, setLeaders] = useState<LeaderEntry[]>(_cachedLeaders);
  const [loading, setLoading] = useState(_cachedLeaders.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cachedLeaders.length > 0 && now - _cacheTimestamp < CACHE_TTL_MS) {
      setLeaders(_cachedLeaders);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'leaderboard_public'),
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
      _cachedLeaders = list;
      _cacheTimestamp = Date.now();
      setLeaders(list);
    } catch (_) {
      setError(t('error_loading') || 'Não foi possível carregar o ranking.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  // Injeta banners de anúncio a cada 10 posições do ranking
  type ListItem = (LeaderEntry & { _rank: number }) | { __ad: true; id: string };
  const AD_INTERVAL = 10;
  const listData: ListItem[] = useMemo(() => {
    const result: ListItem[] = [];
    leaders.forEach((entry, i) => {
      result.push({ ...entry, _rank: i });
      if ((i + 1) % AD_INTERVAL === 0) {
        result.push({ __ad: true, id: `ad-after-${entry.uid}` });
      }
    });
    return result;
  }, [leaders]);

  const bg = isDark ? '#0F172A' : '#F1F5F9';
  const cardBg = isDark ? '#1E293B' : '#fff';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subColor = isDark ? '#94A3B8' : '#64748B';

  const renderItem = ({ item }: { item: ListItem }) => {
    if ('__ad' in item) {
      return (
        <View style={styles.adCard}>
          <Text style={styles.adLabel}>{t('advertising')}</Text>
          <AdBanner size={BannerAdSize.MEDIUM_RECTANGLE} />
        </View>
      );
    }

    const rank = getRank(item.points);
    const isMe = item.uid === myUid;
    const medal = MEDALS[item._rank] ?? null;

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
            : <Text style={[styles.pos, { color: subColor }]}>{item._rank + 1}</Text>}
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
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={[styles.emptyText, { color: subColor }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); load(true); }}
          >
            <Text style={styles.retryText}>↺ {t('retry') || 'Tentar novamente'}</Text>
          </TouchableOpacity>
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
          data={listData}
          keyExtractor={(item) => ('__ad' in item ? item.id : item.uid)}
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
  retryBtn: { backgroundColor: '#FF5722', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  adCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', paddingTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  adLabel: { fontSize: 10, color: '#bbb', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
});
