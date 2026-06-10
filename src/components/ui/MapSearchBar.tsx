/**
 * MapSearchBar — barra de busca flutuante no topo do mapa (estilo Google Maps / Waze).
 *
 * Funcionalidades:
 *   - Busca local em eventos carregados (instantânea, sem rede)
 *   - Autocomplete de endereços via Google Places Autocomplete API
 *   - Fallback: expo-location.geocodeAsync quando a API key não está disponível
 *
 * UX:
 *   - Pill flutuante no topo
 *   - Expande pra lista quando focada
 *   - Sugestões de endereço enquanto digita (debounce 400ms)
 *   - Spinner individual no item sendo carregado
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
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { shadow, platformShadow, radius } from '../../theme/tokens';
import { useT } from '../../hooks/useT';
import { track } from '../../services/analytics';

// EXPO_PUBLIC_* é substituído literalmente pelo Metro no bundle
const MAPS_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// ─── Tipos públicos ──────────────────────────────────────────────────────────

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

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface Props {
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
  /** Localização atual do usuário — usada para biasing do autocomplete */
  userLocation?: { latitude: number; longitude: number } | null;
  onSelectResult: (r: SearchResult) => void;
}

// ─── Estratégia de busca em cascata (Waze-style) ─────────────────────────────
//
// 1. Google Places Autocomplete — sugestões enquanto digita (requer Places API)
// 2. Google Geocoding API       — resolve endereço completo (mesmo key, mais permissivo)
// 3. expo-location geocodeAsync — fallback nativo (sempre funciona no Android)

async function tryAbortableFetch(url: string, timeoutMs = 5000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function fetchSuggestions(
  input: string,
  userLocation?: { latitude: number; longitude: number } | null
): Promise<PlaceSuggestion[]> {
  if (input.length < 2) return [];

  // ── Estratégia 1: Google Places Autocomplete ────────────────────────────────
  if (MAPS_KEY) {
    const bias = userLocation
      ? `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`
      : '&components=country:br';
    const json = await tryAbortableFetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(input)}&language=pt-BR${bias}&key=${MAPS_KEY}`
    );
    if (json?.status === 'OK' && json.predictions?.length > 0) {
      return json.predictions.slice(0, 6).map((p: any) => ({
        placeId: p.place_id,
        mainText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? '',
      }));
    }
  }

  // ── Estratégia 2: Google Geocoding API (texto livre → coordenada) ───────────
  if (MAPS_KEY) {
    const region = userLocation ? '&region=br' : '&components=country:BR';
    const json = await tryAbortableFetch(
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(input)}&language=pt-BR${region}&key=${MAPS_KEY}`
    );
    if (json?.status === 'OK' && json.results?.length > 0) {
      return json.results.slice(0, 5).map((r: any) => ({
        placeId: r.place_id ?? `geo:${r.geometry.location.lat}:${r.geometry.location.lng}`,
        mainText: r.address_components?.[0]?.long_name ?? input,
        secondaryText: r.formatted_address ?? '',
      }));
    }
  }

  // ── Estratégia 3: expo-location geocodeAsync (nativo, sempre disponível) ────
  try {
    const results = await Location.geocodeAsync(input);
    if (results.length === 0) return [];
    const out: PlaceSuggestion[] = [];
    for (const r of results.slice(0, 4)) {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        const main = [place?.name, place?.street].filter(Boolean).join(', ') || input;
        const sub = [place?.city, place?.region].filter(Boolean).join(', ');
        out.push({ placeId: `geo:${r.latitude}:${r.longitude}`, mainText: main, secondaryText: sub });
      } catch {
        out.push({ placeId: `geo:${r.latitude}:${r.longitude}`, mainText: input, secondaryText: '' });
      }
    }
    return out;
  } catch { return []; }
}

async function fetchPlaceCoords(
  placeId: string
): Promise<{ lat: number; lng: number; name: string; address: string } | null> {
  // Resultado do geocoding nativo — coords embutidas no placeId
  if (placeId.startsWith('geo:')) {
    const [, lat, lng] = placeId.split(':');
    const la = parseFloat(lat), lo = parseFloat(lng);
    if (!isNaN(la) && !isNaN(lo)) return { lat: la, lng: lo, name: '', address: '' };
    return null;
  }
  // Google Places Details
  if (!MAPS_KEY) return null;
  const json = await tryAbortableFetch(
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=geometry,name,formatted_address&key=${MAPS_KEY}`
  );
  if (json?.status !== 'OK') return null;
  const loc = json.result?.geometry?.location;
  if (!loc) return null;
  return {
    lat: loc.lat, lng: loc.lng,
    name: json.result.name ?? '',
    address: json.result.formatted_address ?? '',
  };

}

/** Fallback quando não há chave do Maps: usa geocoding nativo do SO */
async function geocodeFallback(query: string): Promise<SearchResult[]> {
  try {
    const results = await Location.geocodeAsync(query);
    return results.slice(0, 3).map((r, i) => ({
      id: `geo-${i}`,
      kind: 'place' as const,
      title: query,
      subtitle: 'Localização aproximada',
      emoji: '📍',
      coords: { latitude: r.latitude, longitude: r.longitude },
    }));
  } catch {
    return [];
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MapSearchBar({ localEvents = [], userLocation, onSelectResult }: Props) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [fallbackResults, setFallbackResults] = useState<SearchResult[]>([]);

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

  // ─── Busca local instantânea (eventos) ──────────────────────────────────────
  const eventResults: SearchResult[] =
    query.length >= 2
      ? localEvents
          .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5)
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

  // ─── Autocomplete de endereços (debounced, rede) ─────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setFallbackResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (MAPS_KEY) {
          const s = await fetchSuggestions(query, userLocation);
          setSuggestions(s);
          setFallbackResults([]);
        } else {
          const fb = await geocodeFallback(query);
          setFallbackResults(fb);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectSuggestion = async (s: PlaceSuggestion) => {
    setLoadingPlaceId(s.placeId);
    try {
      const details = await fetchPlaceCoords(s.placeId);
      if (!details) return;
      const result: SearchResult = {
        id: `place-${s.placeId}`,
        kind: 'place',
        title: s.mainText,
        subtitle: s.secondaryText || details.address,
        emoji: '📍',
        coords: { latitude: details.lat, longitude: details.lng },
      };
      track('map_pin_tapped', { source: 'search_address', kind: 'place' });
      onSelectResult(result);
      setQuery('');
      setFocused(false);
      setSuggestions([]);
      inputRef.current?.blur();
    } finally {
      setLoadingPlaceId(null);
    }
  };

  const handleSelectEvent = (r: SearchResult) => {
    track('map_pin_tapped', { source: 'search_event', kind: 'event' });
    onSelectResult(r);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleSelectFallback = (r: SearchResult) => {
    track('map_pin_tapped', { source: 'search_geocode', kind: 'place' });
    onSelectResult(r);
    setQuery('');
    setFocused(false);
    setFallbackResults([]);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setFallbackResults([]);
  };

  const hasResults =
    eventResults.length > 0 || suggestions.length > 0 || fallbackResults.length > 0;
  const showDropdown = focused && query.length >= 2;

  return (
    <View style={[styles.wrap, { top: insets.top + 12 }]} pointerEvents="box-none">
      {/* Barra de busca */}
      <View
        style={[styles.bar, { backgroundColor: theme.bg.surface }, platformShadow(shadow.lg)]}
      >
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text.primary }]}
          placeholder={t('search_placeholder') || '🔍 Para onde? Digite um endereço…'}
          placeholderTextColor={theme.text.tertiary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && (
          <ActivityIndicator size="small" color="#FF5722" style={{ marginRight: 4 }} />
        )}
        {query.length > 0 && !loading && (
          <Pressable onPress={handleClear} hitSlop={10}>
            <Text style={[styles.clearIcon, { color: theme.text.tertiary }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.bg.surface },
            platformShadow(shadow.xl),
          ]}
        >
          {!hasResults && !loading ? (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              Nada encontrado para "{query}"{'\n'}
              <Text style={{ fontSize: 11, lineHeight: 16 }}>
                💡 Dica: inclua a cidade ou estado{'\n'}
                Ex: "Estrada Francisco da Cruz, RJ"
              </Text>
            </Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
              {/* Eventos locais */}
              {eventResults.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
                    EVENTOS
                  </Text>
                  {eventResults.map((r) => (
                    <EventRow key={r.id} result={r} onPress={handleSelectEvent} theme={theme} />
                  ))}
                </>
              )}

              {/* Sugestões de endereço (Places API) */}
              {suggestions.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
                    ENDEREÇOS
                  </Text>
                  {suggestions.map((s) => (
                    <SuggestionRow
                      key={s.placeId}
                      suggestion={s}
                      loadingThis={loadingPlaceId === s.placeId}
                      anyLoading={loadingPlaceId !== null}
                      onPress={handleSelectSuggestion}
                      theme={theme}
                    />
                  ))}
                </>
              )}

              {/* Fallback geocoding */}
              {fallbackResults.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.text.tertiary }]}>
                    LOCAIS
                  </Text>
                  {fallbackResults.map((r) => (
                    <EventRow
                      key={r.id}
                      result={r}
                      onPress={handleSelectFallback}
                      theme={theme}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function EventRow({
  result,
  onPress,
  theme,
}: {
  result: SearchResult;
  onPress: (r: SearchResult) => void;
  theme: any;
}) {
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
        <Text
          style={[styles.resultTitle, { color: theme.text.primary }]}
          numberOfLines={1}
        >
          {result.title}
        </Text>
        {result.subtitle ? (
          <Text
            style={[styles.resultSubtitle, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            {result.subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.resultChevron, { color: theme.text.tertiary }]}>›</Text>
    </Pressable>
  );
}

function SuggestionRow({
  suggestion,
  loadingThis,
  anyLoading,
  onPress,
  theme,
}: {
  suggestion: PlaceSuggestion;
  loadingThis: boolean;
  anyLoading: boolean;
  onPress: (s: PlaceSuggestion) => void;
  theme: any;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultRow,
        { borderBottomColor: theme.border.subtle },
        pressed && !anyLoading && { backgroundColor: theme.brand.surface },
        anyLoading && { opacity: loadingThis ? 1 : 0.45 },
      ]}
      onPress={() => onPress(suggestion)}
      disabled={anyLoading}
    >
      <Text style={styles.resultEmoji}>📍</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.resultTitle, { color: theme.text.primary }]}
          numberOfLines={1}
        >
          {suggestion.mainText}
        </Text>
        {suggestion.secondaryText ? (
          <Text
            style={[styles.resultSubtitle, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            {suggestion.secondaryText}
          </Text>
        ) : null}
      </View>
      {loadingThis ? (
        <ActivityIndicator size="small" color="#FF5722" />
      ) : (
        <Text style={[styles.resultChevron, { color: theme.text.tertiary }]}>›</Text>
      )}
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
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
  resultSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
    includeFontPadding: false,
  },
  resultChevron: { fontSize: 22, fontWeight: '300' },
});
