/**
 * SavedRouteModal — duas abas:
 *   1. Rotas salvas  → define corredor Origem→Destino e recebe alertas.
 *   2. Endereços salvos → salva um endereço (ex: "Casa") e abre GPS com 1 toque.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Switch, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rw, rh, rf } from '../utils/responsive';

// ─── Google Places API ────────────────────────────────────────────────────────
const MAPS_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface PlaceSuggestion { placeId: string; mainText: string; secondaryText: string; }

async function fetchSuggestions(
  input: string,
  userLocation?: { lat: number; lon: number } | null,
): Promise<PlaceSuggestion[]> {
  if (input.length < 2) return [];

  if (MAPS_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const locationParam = userLocation
        ? `&location=${userLocation.lat},${userLocation.lon}&radius=50000`
        : '&components=country:br';
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(input)}&language=pt-BR${locationParam}&key=${MAPS_KEY}`;
      const res = await fetch(url, { signal: controller.signal });
      const json = await res.json();
      if (json.status === 'OK') {
        return (json.predictions ?? []).slice(0, 6).map((p: any) => ({
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text ?? p.description,
          secondaryText: p.structured_formatting?.secondary_text ?? '',
        }));
      }
    } catch { /* fallback */ }
    finally { clearTimeout(timer); }
  }

  try {
    const results = await Location.geocodeAsync(input);
    if (results.length === 0) return [];
    const mapped: PlaceSuggestion[] = [];
    for (const r of results.slice(0, 4)) {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
        const mainText = [place?.name, place?.street].filter(Boolean).join(', ') || input;
        const secondaryText = [place?.city, place?.region].filter(Boolean).join(', ');
        mapped.push({ placeId: `geo:${r.latitude}:${r.longitude}`, mainText, secondaryText });
      } catch {
        mapped.push({ placeId: `geo:${r.latitude}:${r.longitude}`, mainText: input, secondaryText: '' });
      }
    }
    return mapped;
  } catch { return []; }
}

async function fetchPlaceCoords(placeId: string): Promise<{ lat: number; lng: number; label: string } | null> {
  if (placeId.startsWith('geo:')) {
    const parts = placeId.split(':');
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng, label: '' };
    return null;
  }
  if (!MAPS_KEY) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}&fields=geometry,name,formatted_address&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK') return null;
    const loc = json.result?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng, label: json.result.name ?? json.result.formatted_address ?? '' };
  } catch { return null; }
}

// Re-exporta tipos e funções do serviço para compatibilidade com imports existentes
export {
  SAVED_ROUTES_KEY, CORRIDOR_KM,
  SavedRoute, loadSavedRoutes, saveSavedRoutes, isPointNearRoute,
  SAVED_ADDRESSES_KEY,
  SavedAddress, loadSavedAddresses, saveSavedAddresses,
} from '../services/savedRoutesService';
import {
  SavedRoute, SavedAddress,
  CORRIDOR_KM,
  loadSavedRoutes, saveSavedRoutes,
  loadSavedAddresses, saveSavedAddresses,
} from '../services/savedRoutesService';

/** Abre o app de GPS nativo com navegação até lat/lon. */
function openGPS(lat: number, lon: number, label: string) {
  // Google Maps intent (Android/iOS)
  const encoded = encodeURIComponent(label || `${lat},${lon}`);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${encoded}&travelmode=driving`;
  Linking.openURL(url).catch(() => {
    // Fallback: geo URI (abre qualquer app de mapas no Android)
    Linking.openURL(`geo:${lat},${lon}?q=${lat},${lon}(${encoded})`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo de mapas.');
    });
  });
}

// isPointNearRoute movido para savedRoutesService.ts — re-exportado acima

// ─── AddressInput ─────────────────────────────────────────────────────────────
interface AddressInputProps {
  label: string;
  color: string;
  bgColor: string;
  value: { lat: number; lon: number; label: string } | null;
  userLocation?: { lat: number; lon: number } | null;
  onSelect: (point: { lat: number; lon: number; label: string }) => void;
  onUseGPS: () => void;
  loadingGPS: boolean;
}

function AddressInput({ label, color, bgColor, value, userLocation, onSelect, onUseGPS, loadingGPS }: AddressInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [loadingPlace, setLoadingPlace] = useState<string | null>(null);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); setNoResults(false); return; }
    setNoResults(false);
    debounceRef.current = setTimeout(async () => {
      setLoadingSugg(true);
      const s = await fetchSuggestions(query, userLocation);
      setSuggestions(s);
      setNoResults(s.length === 0);
      setLoadingSugg(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, userLocation]);

  async function handleSelect(s: PlaceSuggestion) {
    setLoadingPlace(s.placeId);
    const coords = await fetchPlaceCoords(s.placeId);
    setLoadingPlace(null);
    if (!coords) { Alert.alert('Erro', 'Não foi possível obter as coordenadas do endereço.'); return; }
    onSelect({ lat: coords.lat, lon: coords.lng, label: s.mainText });
    setQuery('');
    setSuggestions([]);
    setNoResults(false);
    inputRef.current?.blur();
  }

  return (
    <View style={{ marginBottom: rh(4) }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.addressInputWrap, query.length > 0 && { borderColor: color }]}>
        <Text style={{ fontSize: rf(16), marginRight: rw(6) }}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={[styles.addressInput, { color: '#1E293B' }]}
          placeholder={value ? `✅ ${value.label}` : 'Digite o endereço ou bairro...'}
          placeholderTextColor={value ? color : '#94A3B8'}
          value={query}
          onChangeText={(t) => { setQuery(t); if (value) onSelect(null as any); }}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {loadingSugg && <ActivityIndicator size="small" color={color} style={{ marginRight: rw(8) }} />}
        {query.length > 0 && !loadingSugg && (
          <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); setNoResults(false); }} hitSlop={8}>
            <Text style={{ color: '#94A3B8', fontSize: rf(16), paddingHorizontal: rw(8) }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {noResults && query.length >= 2 && (
        <Text style={styles.noResultsText}>Nenhum endereço encontrado. Tente incluir a cidade.</Text>
      )}

      {suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.placeId}
              style={styles.suggestionRow}
              onPress={() => handleSelect(s)}
              disabled={loadingPlace !== null}
            >
              <Text style={styles.suggestionIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionMain} numberOfLines={1}>{s.mainText}</Text>
                {s.secondaryText ? <Text style={styles.suggestionSub} numberOfLines={1}>{s.secondaryText}</Text> : null}
              </View>
              {loadingPlace === s.placeId
                ? <ActivityIndicator size="small" color={color} />
                : <Text style={{ color: '#94A3B8', fontSize: rf(18) }}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.gpsBtn, { borderColor: color }]} onPress={onUseGPS} disabled={loadingGPS}>
        {loadingGPS
          ? <ActivityIndicator size="small" color={color} />
          : <Text style={[styles.gpsBtnText, { color }]}>📡 Usar minha localização atual</Text>}
      </TouchableOpacity>

      {value && !query && (
        <View style={[styles.selectedPoint, { borderColor: color, backgroundColor: bgColor }]}>
          <Text style={[styles.selectedPointText, { color }]}>✅ {value.label}</Text>
          <TouchableOpacity onPress={() => onSelect(null as any)} hitSlop={8}>
            <Text style={{ color, fontSize: rf(14), fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Banner de introdução — Endereços Salvos ──────────────────────────────────
function AddressesIntroBanner() {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={styles.introBanner}>
      <TouchableOpacity style={styles.introHeader} onPress={() => setExpanded(v => !v)} activeOpacity={0.8}>
        <View style={styles.introHeaderLeft}>
          <Text style={styles.introEmoji}>🏠</Text>
          <View>
            <Text style={styles.introTitle}>O que são Endereços Salvos?</Text>
            <Text style={styles.introSub}>Toque para saber mais</Text>
          </View>
        </View>
        <Text style={styles.introChevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.introBody}>
          <View style={styles.introItem}>
            <Text style={styles.introItemEmoji}>📌</Text>
            <View style={styles.introItemText}>
              <Text style={styles.introItemTitle}>Salve locais frequentes</Text>
              <Text style={styles.introItemDesc}>
                Guarde endereços que você usa no dia a dia — como sua casa, trabalho ou academia — com um nome personalizado.
              </Text>
            </View>
          </View>
          <View style={styles.introItem}>
            <Text style={styles.introItemEmoji}>🗺️</Text>
            <View style={styles.introItemText}>
              <Text style={styles.introItemTitle}>Navegue com 1 toque</Text>
              <Text style={styles.introItemDesc}>
                Toque em qualquer endereço salvo e o GPS do seu celular abre automaticamente com a rota pronta.
              </Text>
            </View>
          </View>
          <View style={styles.introItem}>
            <Text style={styles.introItemEmoji}>⚡</Text>
            <View style={styles.introItemText}>
              <Text style={styles.introItemTitle}>Acesso rápido</Text>
              <Text style={styles.introItemDesc}>
                Sem precisar digitar o endereço toda vez. Ideal para quem usa o GPS diariamente.
              </Text>
            </View>
          </View>
          <View style={styles.introTip}>
            <Text style={styles.introTipText}>
              💡 <Text style={styles.introTipBold}>Dica:</Text> Adicione "Casa", "Trabalho" e outros locais frequentes. Toque no botão <Text style={styles.introTipBold}>"Navegar"</Text> para abrir o mapa.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'routes' | 'addresses';
type Step = 'list' | 'new';

export function SavedRouteModal({ visible, onClose }: Props) {
  const { top } = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('routes');

  // ── Rotas ──────────────────────────────────────────────────────────────────
  const [routeStep, setRouteStep] = useState<Step>('list');
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeName, setRouteName] = useState('Casa → Trabalho');
  const [gettingOrigin, setGettingOrigin] = useState(false);
  const [gettingDest, setGettingDest] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [dest, setDest] = useState<{ lat: number; lon: number; label: string } | null>(null);

  // ── Endereços ──────────────────────────────────────────────────────────────
  const [addrStep, setAddrStep] = useState<Step>('list');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrName, setAddrName] = useState('');
  const [addrPoint, setAddrPoint] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [gettingAddrGPS, setGettingAddrGPS] = useState(false);

  // Localização para bias do autocomplete
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    Location.getLastKnownPositionAsync({ maxAge: 300_000 })
      .then((pos) => { if (pos) setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }); })
      .catch(() => {});
    loadSavedRoutes().then(setRoutes);
    loadSavedAddresses().then(setAddresses);
  }, [visible]);

  async function getCurrentCoords() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Ative a localização para definir o ponto.');
      return null;
    }
    try {
      const pos = await Promise.race<Location.LocationObject>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GPS timeout')), 10_000)),
      ]);
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      Alert.alert('GPS indisponível', 'Não foi possível obter sua localização. Verifique se o GPS está ativado e tente novamente.');
      return null;
    }
  }

  // ── Handlers — Rotas ───────────────────────────────────────────────────────
  async function handleSetOrigin() {
    setGettingOrigin(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) return;
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lon });
      const label = [place?.street, place?.city].filter(Boolean).join(', ') || 'Origem';
      setOrigin({ ...coords, label });
    } finally { setGettingOrigin(false); }
  }

  async function handleSetDest() {
    setGettingDest(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) return;
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lon });
      const label = [place?.street, place?.city].filter(Boolean).join(', ') || 'Destino';
      setDest({ ...coords, label });
    } finally { setGettingDest(false); }
  }

  async function handleSaveRoute() {
    if (!origin || !dest) { Alert.alert('Atenção', 'Defina a origem e o destino antes de salvar.'); return; }
    setRouteLoading(true);
    const newRoute: SavedRoute = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: routeName.trim() || 'Minha Rota',
      originLat: origin.lat, originLon: origin.lon,
      destLat: dest.lat, destLon: dest.lon,
      enabled: true,
    };
    const updated = [...routes, newRoute];
    await saveSavedRoutes(updated);
    setRoutes(updated);
    setRouteStep('list');
    setRouteName('Casa → Trabalho');
    setOrigin(null);
    setDest(null);
    setRouteLoading(false);
  }

  async function toggleRoute(id: string, enabled: boolean) {
    const previous = routes;
    const updated = routes.map((r) => r.id === id ? { ...r, enabled } : r);
    setRoutes(updated);
    try { await saveSavedRoutes(updated); }
    catch { setRoutes(previous); Alert.alert('Erro', 'Não foi possível salvar a alteração. Tente novamente.'); }
  }

  async function deleteRoute(id: string) {
    Alert.alert('Remover rota', 'Deseja remover esta rota salva?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          const updated = routes.filter((r) => r.id !== id);
          setRoutes(updated);
          await saveSavedRoutes(updated);
        },
      },
    ]);
  }

  // ── Handlers — Endereços ───────────────────────────────────────────────────
  async function handleAddrGPS() {
    setGettingAddrGPS(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) return;
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lon });
      const label = [place?.street, place?.name, place?.city].filter(Boolean).join(', ') || 'Localização atual';
      setAddrPoint({ ...coords, label });
    } finally { setGettingAddrGPS(false); }
  }

  async function handleSaveAddress() {
    if (!addrPoint) { Alert.alert('Atenção', 'Busque e selecione um endereço antes de salvar.'); return; }
    const trimmedName = addrName.trim();
    if (!trimmedName) { Alert.alert('Atenção', 'Dê um nome para este endereço (ex: "Casa", "Trabalho").'); return; }
    setAddrLoading(true);
    const newAddr: SavedAddress = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      lat: addrPoint.lat,
      lon: addrPoint.lon,
      label: addrPoint.label,
    };
    const updated = [...addresses, newAddr];
    await saveSavedAddresses(updated);
    setAddresses(updated);
    setAddrStep('list');
    setAddrName('');
    setAddrPoint(null);
    setAddrLoading(false);
  }

  async function deleteAddress(id: string) {
    Alert.alert('Remover endereço', 'Deseja remover este endereço salvo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          const updated = addresses.filter((a) => a.id !== id);
          setAddresses(updated);
          await saveSavedAddresses(updated);
        },
      },
    ]);
  }

  // ── Navegação: voltar ou fechar ────────────────────────────────────────────
  function handleBack() {
    if (activeTab === 'routes' && routeStep === 'new') { setRouteStep('list'); return; }
    if (activeTab === 'addresses' && addrStep === 'new') { setAddrStep('list'); return; }
    onClose();
  }

  const isOnNewForm = (activeTab === 'routes' && routeStep === 'new') || (activeTab === 'addresses' && addrStep === 'new');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleBack}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <View style={[styles.root, { paddingTop: top }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={12}>
            <Text style={styles.backBtn}>{isOnNewForm ? '← Voltar' : '✕'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isOnNewForm
              ? (activeTab === 'routes' ? 'Nova rota' : 'Novo endereço')
              : '📍 Locais & Rotas'}
          </Text>
          {!isOnNewForm && (
            <TouchableOpacity onPress={() => activeTab === 'routes' ? setRouteStep('new') : setAddrStep('new')}>
              <Text style={styles.addBtn}>+ Novo</Text>
            </TouchableOpacity>
          )}
          {isOnNewForm && <View style={{ width: 60 }} />}
        </View>

        {/* Abas */}
        {!isOnNewForm && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'routes' && styles.tabActive]}
              onPress={() => setActiveTab('routes')}
            >
              <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>🛣 Rotas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'addresses' && styles.tabActive]}
              onPress={() => setActiveTab('addresses')}
            >
              <Text style={[styles.tabText, activeTab === 'addresses' && styles.tabTextActive]}>🏠 Endereços</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ABA: ROTAS ──────────────────────────────────────────────────── */}
        {activeTab === 'routes' && routeStep === 'list' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {routes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyTitle}>Nenhuma rota salva</Text>
                <Text style={styles.emptySub}>
                  Salve sua rota diária e receba alertas quando houver ocorrências no caminho.
                </Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setRouteStep('new')}>
                  <Text style={styles.createBtnText}>+ Criar minha primeira rota</Text>
                </TouchableOpacity>
              </View>
            ) : (
              routes.map((route) => (
                <View key={route.id} style={styles.routeCard}>
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <Switch
                      value={route.enabled}
                      onValueChange={(v) => toggleRoute(route.id, v)}
                      trackColor={{ false: '#E2E8F0', true: '#FF5722' }}
                      thumbColor="#fff"
                    />
                  </View>
                  <Text style={styles.routeMeta}>📍 Notificações: {route.enabled ? 'ativadas' : 'desativadas'}</Text>
                  <Text style={styles.routeMeta}>↔ Corredor de {CORRIDOR_KM} km ao redor da rota</Text>
                  <TouchableOpacity style={styles.deleteRouteBtn} onPress={() => deleteRoute(route.id)}>
                    <Text style={styles.deleteRouteBtnText}>🗑 Remover</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {activeTab === 'routes' && routeStep === 'new' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.fieldLabel}>Nome da rota</Text>
            <TextInput
              style={styles.input}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Ex: Casa → Trabalho"
              maxLength={40}
            />
            <AddressInput
              label="Ponto de origem"
              color="#2E7D32"
              bgColor="#E8F5E9"
              value={origin}
              userLocation={userLocation}
              onSelect={(p) => setOrigin(p)}
              onUseGPS={handleSetOrigin}
              loadingGPS={gettingOrigin}
            />
            <AddressInput
              label="Ponto de destino"
              color="#1565C0"
              bgColor="#E3F2FD"
              value={dest}
              userLocation={userLocation}
              onSelect={(p) => setDest(p)}
              onUseGPS={handleSetDest}
              loadingGPS={gettingDest}
            />
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔔 Alertas num raio de {CORRIDOR_KM} km ao longo da rota serão notificados automaticamente.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, (!origin || !dest || routeLoading) && styles.saveBtnDisabled]}
              onPress={handleSaveRoute}
              disabled={!origin || !dest || routeLoading}
            >
              {routeLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>💾 Salvar rota</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── ABA: ENDEREÇOS ──────────────────────────────────────────────── */}
        {activeTab === 'addresses' && addrStep === 'list' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <AddressesIntroBanner />

            {addresses.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🏠</Text>
                <Text style={styles.emptyTitle}>Nenhum endereço salvo</Text>
                <Text style={styles.emptySub}>
                  Adicione sua casa, trabalho ou qualquer local frequente para acessar a navegação rapidamente.
                </Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setAddrStep('new')}>
                  <Text style={styles.createBtnText}>+ Adicionar endereço</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {addresses.map((addr) => (
                  <View key={addr.id} style={styles.addrCard}>
                    <View style={styles.addrInfo}>
                      <Text style={styles.addrName}>{addr.name}</Text>
                      <Text style={styles.addrLabel} numberOfLines={2}>{addr.label}</Text>
                    </View>
                    <View style={styles.addrActions}>
                      <TouchableOpacity
                        style={styles.navigateBtn}
                        onPress={() => openGPS(addr.lat, addr.lon, addr.label)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.navigateBtnText}>🗺️ Navegar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteAddress(addr.id)} hitSlop={8}>
                        <Text style={styles.deleteAddrText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {activeTab === 'addresses' && addrStep === 'new' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.fieldLabel}>Nome do endereço</Text>
            <TextInput
              style={styles.input}
              value={addrName}
              onChangeText={setAddrName}
              placeholder='Ex: Casa, Trabalho, Academia...'
              maxLength={30}
              autoCapitalize="words"
            />

            <AddressInput
              label="Endereço"
              color="#FF5722"
              bgColor="#FFF3F0"
              value={addrPoint}
              userLocation={userLocation}
              onSelect={(p) => setAddrPoint(p)}
              onUseGPS={handleAddrGPS}
              loadingGPS={gettingAddrGPS}
            />

            <View style={[styles.infoBox, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.infoText, { color: '#92400E' }]}>
                🗺️ Após salvar, toque em <Text style={{ fontWeight: '700' }}>"Navegar"</Text> para abrir o GPS do seu celular com o destino preenchido automaticamente.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!addrPoint || !addrName.trim() || addrLoading) && styles.saveBtnDisabled]}
              onPress={handleSaveAddress}
              disabled={!addrPoint || !addrName.trim() || addrLoading}
            >
              {addrLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>💾 Salvar endereço</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}

      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rw(16), paddingVertical: rh(14),
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: rf(17), fontWeight: '800', color: '#1E293B' },
  backBtn: { fontSize: rf(15), fontWeight: '700', color: '#E53935', minWidth: 60 },
  addBtn: { fontSize: rf(15), fontWeight: '800', color: '#FF5722', minWidth: 60, textAlign: 'right' },

  // ── Abas ────────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: rh(12),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FF5722' },
  tabText: { fontSize: rf(14), fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#FF5722', fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: {
    padding: rw(16), gap: rh(12), paddingBottom: rh(40),
    // Em tablets/telas largas, evita que o conteúdo fique esticado de ponta a ponta
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },

  empty: { alignItems: 'center', paddingTop: rh(40), gap: rh(10) },
  emptyEmoji: { fontSize: rf(52) },
  emptyTitle: { fontSize: rf(18), fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: rf(13), color: '#888', textAlign: 'center', lineHeight: rf(19), paddingHorizontal: rw(16) },
  createBtn: {
    marginTop: rh(8), backgroundColor: '#FF5722', borderRadius: rw(14),
    paddingHorizontal: rw(20), paddingVertical: rh(14),
  },
  createBtnText: { fontSize: rf(15), fontWeight: '800', color: '#fff' },

  // ── Rotas ────────────────────────────────────────────────────────────────────
  routeCard: {
    backgroundColor: '#fff', borderRadius: rw(16), padding: rw(16),
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    gap: rh(6),
  },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeName: { fontSize: rf(15), fontWeight: '800', color: '#1E293B', flex: 1 },
  routeMeta: { fontSize: rf(12), color: '#64748B' },
  deleteRouteBtn: { marginTop: rh(4), alignSelf: 'flex-start' },
  deleteRouteBtnText: { fontSize: rf(13), color: '#E53935', fontWeight: '700' },

  // ── Endereços ─────────────────────────────────────────────────────────────
  addrCard: {
    backgroundColor: '#fff', borderRadius: rw(16), padding: rw(16),
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    flexDirection: 'row', alignItems: 'center', gap: rw(12),
  },
  addrInfo: { flex: 1, gap: rh(3) },
  addrName: { fontSize: rf(15), fontWeight: '800', color: '#1E293B' },
  addrLabel: { fontSize: rf(12), color: '#64748B', lineHeight: rf(17) },
  addrActions: { alignItems: 'center', gap: rh(10) },
  navigateBtn: {
    backgroundColor: '#FF5722', borderRadius: rw(10),
    paddingHorizontal: rw(12), paddingVertical: rh(8),
  },
  navigateBtnText: { fontSize: rf(13), fontWeight: '800', color: '#fff' },
  deleteAddrText: { fontSize: rf(20), color: '#94A3B8' },

  // ── Banner de introdução ──────────────────────────────────────────────────
  introBanner: {
    backgroundColor: '#fff', borderRadius: rw(16), overflow: 'hidden',
    borderWidth: 1, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  introHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rw(16), paddingVertical: rh(14),
    backgroundColor: '#FFF8F6', borderBottomWidth: 1, borderBottomColor: '#FFE0D6',
  },
  introHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: rw(12) },
  introEmoji: { fontSize: rf(26) },
  introTitle: { fontSize: rf(14), fontWeight: '700', color: '#FF5722' },
  introSub: { fontSize: rf(11), color: '#999', marginTop: 1 },
  introChevron: { fontSize: rf(11), color: '#FF5722', fontWeight: '700' },
  introBody: { padding: rw(12), gap: rh(10) },
  introItem: { flexDirection: 'row', gap: rw(10), alignItems: 'flex-start' },
  introItemEmoji: { fontSize: rf(22), marginTop: 1 },
  introItemText: { flex: 1 },
  introItemTitle: { fontSize: rf(13), fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  introItemDesc: { fontSize: rf(12), color: '#555', lineHeight: rf(17) },
  introTip: {
    backgroundColor: '#FFFDE7', borderRadius: rw(10), padding: rw(12),
    borderWidth: 1, borderColor: '#FFF176', marginTop: 2,
  },
  introTipText: { fontSize: rf(12), color: '#555', lineHeight: rf(18) },
  introTipBold: { fontWeight: '700', color: '#333' },

  // ── Formulário ───────────────────────────────────────────────────────────
  fieldLabel: { fontSize: rf(12), fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: rh(8) },
  input: {
    backgroundColor: '#fff', borderRadius: rw(12), borderWidth: 1.5,
    borderColor: '#E2E8F0', paddingHorizontal: rw(14), paddingVertical: rh(12),
    fontSize: rf(15), color: '#1E293B',
  },
  infoBox: {
    backgroundColor: '#F0FDF4', borderRadius: rw(12), borderWidth: 1,
    borderColor: '#BBF7D0', padding: rw(12), gap: rh(6), marginTop: rh(4),
  },
  infoText: { fontSize: rf(12), color: '#166534', lineHeight: rf(17) },
  saveBtn: {
    backgroundColor: '#FF5722', borderRadius: rw(14),
    paddingVertical: rh(15), alignItems: 'center', marginTop: rh(8),
  },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { fontSize: rf(16), fontWeight: '900', color: '#fff' },

  // ── AddressInput ─────────────────────────────────────────────────────────
  addressInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: rw(12), borderWidth: 1.5,
    borderColor: '#E2E8F0', paddingHorizontal: rw(12),
    minHeight: rh(48),
  },
  addressInput: {
    flex: 1, fontSize: rf(15), color: '#1E293B',
    paddingVertical: rh(10), includeFontPadding: false,
  },
  suggestionsBox: {
    backgroundColor: '#fff', borderRadius: rw(12),
    borderWidth: 1, borderColor: '#E2E8F0',
    marginTop: rh(4), overflow: 'hidden',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rw(12), paddingVertical: rh(11),
    gap: rw(10), borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  suggestionIcon: { fontSize: rf(18) },
  suggestionMain: { fontSize: rf(14), fontWeight: '700', color: '#1E293B' },
  suggestionSub: { fontSize: rf(12), color: '#64748B', marginTop: 1 },
  gpsBtn: {
    marginTop: rh(8), borderWidth: 1.5, borderRadius: rw(10),
    borderStyle: 'dashed', paddingVertical: rh(10), alignItems: 'center',
  },
  gpsBtnText: { fontSize: rf(13), fontWeight: '700' },
  selectedPoint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: rh(6), padding: rw(10), borderRadius: rw(10), borderWidth: 1.5,
  },
  selectedPointText: { fontSize: rf(13), fontWeight: '700', flex: 1 },
  noResultsText: { fontSize: rf(12), color: '#E53935', marginTop: rh(4), paddingHorizontal: rw(4) },
});
