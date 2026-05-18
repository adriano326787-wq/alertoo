/**
 * MapSearchBar — barra de busca flutuante no topo do mapa (estilo Google Maps).
 *
 * Funcionalidades:
 *   - Busca local em eventos carregados (filtro por título)
 *   - Geocoding de endereço/local via expo-location
 *   - Resultado: anima câmera até a coordenada
 *
 * UX:
 *   - Pill flutuante no topo (estilo Google Maps)
 *   - Expande pra lista quando focada
 *   - Esc/back fecha
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { shadow, platformShadow, radius, palette } from '../../theme/tokens';
import { useT } from '../../hooks/useT';
import { track } from '../../services/analytics';

export interface SearchResult {
  id: string;
  kind: 'event' | 'place';
  title: string;
  subtitle?: string;
  emoji?: string;
  coords: { latitude: number; longitude: number };
  eventId?: string;
  eventType?: 'road' | 'entertainment';
}

interface Props {
  /** Eventos locais para busca por nome */
  localEvents?: Array<{
    id: string;
    title: string;
    category?: string;
    cityName?: string;
    stateUF?: string;
    latitude: number;
    longitude: number;
    emoji?: string;
    type: 'road' | 'entertainment';
  }>;
  onSelectResult: (r: SearchResult) => void;
}

export function MapSearchBar({ localEvents = [], onSelectResult }: Props) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [placeResults, setPlaceResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const expand = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(expand, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused]);

  // ─── Filtro local (rápido, sem rede)
  const eventResults: SearchResult[] = query.length >= 2
    ? localEvents
        .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map((e) => ({
          id: `evt-${e.id}`,
          kind: 'event' as const,
          title: e.title,
          subtitle: [e.cityName, e.stateUF].filter(Boolean).join(' — '),
          emoji: e.emoji,
          coords: { latitude: e.latitude, longitude: e.longitude },
          eventId: e.id,
          eventType: e.type,
        }))
    : [];

  // ─── Geocoding via expo-location (debounce 500ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setPlaceResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const results = await Location.geocodeAsync(query);
        const mapped: SearchResult[] = results.slice(0, 5).map((r, i) => ({
          id: `place-${i}`,
          kind: 'place' as const,
          title: query,
          subtitle: r.accuracy ? `~${Math.round(r.accuracy)}m de precisão` : 'Localização',
          emoji: '📍',
          coords: { latitude: r.latitude, longitude: r.longitude },
        }));
        // Tenta enriquecer com nome do lugar via reverse geocode
        if (mapped[0]) {
          try {
            const [place] = await Location.reverseGeocodeAsync(mapped[0].coords);
            const niceName = [place?.name, place?.street, place?.city]
              .filter(Boolean).join(', ');
            if (niceName) {
              mapped[0].title = niceName;
              mapped[0].subtitle = place?.region ?? place?.country ?? mapped[0].subtitle;
            }
          } catch {}
        }
        setPlaceResults(mapped);
      } catch {
        setPlaceResults([]);
      } finally {
        setGeocoding(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    track('map_pin_tapped', { source: 'search', kind: r.kind });
    onSelectResult(r);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setPlaceResults([]);
  };

  const allResults = [...eventResults, ...placeResults];
  const showDropdown = focused && (query.length >= 2);

  return (
    <View style={[styles.wrap, { top: insets.top + 12 }]} pointerEvents="box-none">
      {/* SearchBar */}
      <View style={[styles.bar, { backgroundColor: theme.bg.surface }, platformShadow(shadow.lg)]}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text.primary }]}
          placeholder={t('search_placeholder') || 'Buscar evento ou local…'}
          placeholderTextColor={theme.text.tertiary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={10}>
            <Text style={[styles.clearIcon, { color: theme.text.tertiary }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: theme.bg.surface }, platformShadow(shadow.xl)]}>
          {geocoding && allResults.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Buscando…
            </Text>
          ) : allResults.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Nada encontrado pra "{query}"
            </Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
              {eventResults.length > 0 && (
                <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>EVENTOS</Text>
              )}
              {eventResults.map((r) => (
                <ResultRow key={r.id} result={r} onPress={handleSelect} theme={theme} />
              ))}
              {placeResults.length > 0 && (
                <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>LOCAIS</Text>
              )}
              {placeResults.map((r) => (
                <ResultRow key={r.id} result={r} onPress={handleSelect} theme={theme} />
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function ResultRow({ result, onPress, theme }: { result: SearchResult; onPress: (r: SearchResult) => void; theme: any }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultRow,
        { borderBottomColor: theme.border.subtle },
        pressed && { backgroundColor: theme.brand.surface },
      ]}
      onPress={() => onPress(result)}
    >
      <Text style={styles.resultEmoji}>{result.emoji ?? '📍'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.resultTitle, { color: theme.text.primary }]} numberOfLines={1}>
          {result.title}
        </Text>
        {result.subtitle ? (
          <Text style={[styles.resultSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
            {result.subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.resultChevron, { color: theme.text.tertiary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14, right: 14,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 10,
  },
  icon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    includeFontPadding: false,
  },
  clearIcon: { fontSize: 16, paddingHorizontal: 4 },

  dropdown: {
    marginTop: 8,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sectionLabel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptyText: {
    padding: 18,
    fontSize: 13,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  resultEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  resultTitle: { fontSize: 14, fontWeight: '700', includeFontPadding: false },
  resultSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1, includeFontPadding: false },
  resultChevron: { fontSize: 22, fontWeight: '300' },
});
