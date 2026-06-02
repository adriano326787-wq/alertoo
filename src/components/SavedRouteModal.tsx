/**
 * SavedRouteModal — salva rota habitual e ativa alertas por corredor.
 *
 * O usuário define nome + coordenadas de Origem e Destino.
 * Quando novos eventos chegam dentro de CORRIDOR_KM do segmento
 * origem→destino, uma notificação local é disparada.
 *
 * Persiste em AsyncStorage. Funciona em foreground.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rw, rh, rf } from '../utils/responsive';

export const SAVED_ROUTES_KEY = '@alertoo:saved_routes_v1';
export const CORRIDOR_KM = 1.0; // raio ao redor do segmento

export interface SavedRoute {
  id: string;
  name: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  enabled: boolean;
}

export async function loadSavedRoutes(): Promise<SavedRoute[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveSavedRoutes(routes: SavedRoute[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes));
}

/**
 * Verifica se um ponto (lat,lon) está dentro de CORRIDOR_KM do segmento
 * definido por (originLat,originLon)→(destLat,destLon).
 *
 * Usa distância ponto-segmento com compensação de escala de longitude
 * pela latitude média, o que dá precisão adequada para o Brasil (~20°S).
 */
export function isPointNearRoute(
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number,
  thresholdKm: number = CORRIDOR_KM,
): boolean {
  const latToKm = 111;
  // Compensa escala da longitude pela latitude do centróide do segmento
  const midLat = (aLat + bLat + pLat) / 3;
  const lonToKm = 111 * Math.cos((midLat * Math.PI) / 180);

  const ax = aLon * lonToKm, ay = aLat * latToKm;
  const bx = bLon * lonToKm, by = bLat * latToKm;
  const px = pLon * lonToKm, py = pLat * latToKm;

  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    // Segmento degenerado: usa distância ao ponto único
    return Math.hypot(px - ax, py - ay) <= thresholdKm;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nearX = ax + t * dx;
  const nearY = ay + t * dy;
  return Math.hypot(px - nearX, py - nearY) <= thresholdKm;
}

// ─── Componente ────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = 'list' | 'new';

export function SavedRouteModal({ visible, onClose }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('list');
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('Casa → Trabalho');
  const [gettingOrigin, setGettingOrigin] = useState(false);
  const [gettingDest, setGettingDest] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [dest, setDest] = useState<{ lat: number; lon: number; label: string } | null>(null);

  useEffect(() => {
    if (visible) loadSavedRoutes().then(setRoutes);
  }, [visible]);

  async function getCurrentCoords() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Ative a localização para definir o ponto.');
      return null;
    }
    try {
      // Timeout de 10 s: GPS pode travar indefinidamente em alguns dispositivos
      const pos = await Promise.race<Location.LocationObject>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('GPS timeout')), 10_000)
        ),
      ]);
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      Alert.alert('GPS indisponível', 'Não foi possível obter sua localização. Verifique se o GPS está ativado e tente novamente.');
      return null;
    }
  }

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
    if (!origin || !dest) {
      Alert.alert('Atenção', 'Defina a origem e o destino antes de salvar.');
      return;
    }
    setLoading(true);
    const newRoute: SavedRoute = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || 'Minha Rota',
      originLat: origin.lat, originLon: origin.lon,
      destLat: dest.lat, destLon: dest.lon,
      enabled: true,
    };
    const updated = [...routes, newRoute];
    await saveSavedRoutes(updated);
    setRoutes(updated);
    setStep('list');
    setName('Casa → Trabalho');
    setOrigin(null);
    setDest(null);
    setLoading(false);
  }

  async function toggleRoute(id: string, enabled: boolean) {
    const previous = routes;
    const updated = routes.map((r) => r.id === id ? { ...r, enabled } : r);
    setRoutes(updated); // optimistic update
    try {
      await saveSavedRoutes(updated);
    } catch {
      setRoutes(previous); // rollback
      Alert.alert('Erro', 'Não foi possível salvar a alteração. Tente novamente.');
    }
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={step === 'new' ? () => setStep('list') : onClose} hitSlop={12}>
            <Text style={styles.backBtn}>{step === 'new' ? '← Voltar' : '✕'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'new' ? 'Nova rota' : '📍 Rotas salvas'}
          </Text>
          {step === 'list' && (
            <TouchableOpacity onPress={() => setStep('new')}>
              <Text style={styles.addBtn}>+ Nova</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'list' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {routes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyTitle}>Nenhuma rota salva</Text>
                <Text style={styles.emptySub}>
                  Salve sua rota diária e receba alertas quando houver ocorrências no caminho.
                </Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setStep('new')}>
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
                  <TouchableOpacity
                    style={styles.deleteRouteBtn}
                    onPress={() => deleteRoute(route.id)}
                  >
                    <Text style={styles.deleteRouteBtnText}>🗑 Remover</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.fieldLabel}>Nome da rota</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Casa → Trabalho"
              maxLength={40}
            />

            <Text style={styles.fieldLabel}>Ponto de origem</Text>
            <TouchableOpacity
              style={[styles.locationBtn, origin && styles.locationBtnOriginSet]}
              onPress={handleSetOrigin}
              disabled={gettingOrigin}
              accessibilityLabel={origin ? `Origem definida: ${origin.label}` : 'Definir ponto de origem'}
            >
              {gettingOrigin ? (
                <ActivityIndicator size="small" color="#2E7D32" />
              ) : (
                <Text style={[styles.locationBtnText, origin && styles.locationBtnTextOriginSet]}>
                  {origin ? `✅ ${origin.label}` : '🏠 Usar minha localização como origem'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Ponto de destino</Text>
            <TouchableOpacity
              style={[styles.locationBtn, dest && styles.locationBtnDestSet]}
              onPress={handleSetDest}
              disabled={gettingDest}
              accessibilityLabel={dest ? `Destino definido: ${dest.label}` : 'Definir ponto de destino'}
            >
              {gettingDest ? (
                <ActivityIndicator size="small" color="#1565C0" />
              ) : (
                <Text style={[styles.locationBtnText, dest && styles.locationBtnTextDestSet]}>
                  {dest ? `✅ ${dest.label}` : '🏢 Usar minha localização como destino'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Vá até a origem, toque em "Usar minha localização", depois vá até o destino e repita.
              </Text>
              <Text style={styles.infoText}>
                🔔 Alertas num raio de {CORRIDOR_KM} km ao longo da rota serão notificados automaticamente.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!origin || !dest || loading) && styles.saveBtnDisabled]}
              onPress={handleSaveRoute}
              disabled={!origin || !dest || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>💾 Salvar rota</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
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
  backBtn: { fontSize: rf(15), fontWeight: '700', color: '#E53935' },
  addBtn: { fontSize: rf(15), fontWeight: '800', color: '#FF5722' },
  scroll: { flex: 1 },
  scrollContent: { padding: rw(16), gap: rh(12), paddingBottom: rh(40) },
  empty: { alignItems: 'center', paddingTop: rh(60), gap: rh(10) },
  emptyEmoji: { fontSize: rf(52) },
  emptyTitle: { fontSize: rf(18), fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: rf(13), color: '#888', textAlign: 'center', lineHeight: rf(19), paddingHorizontal: rw(16) },
  createBtn: {
    marginTop: rh(8), backgroundColor: '#FF5722', borderRadius: rw(14),
    paddingHorizontal: rw(20), paddingVertical: rh(14),
  },
  createBtnText: { fontSize: rf(15), fontWeight: '800', color: '#fff' },

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

  fieldLabel: { fontSize: rf(12), fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: rh(8) },
  input: {
    backgroundColor: '#fff', borderRadius: rw(12), borderWidth: 1.5,
    borderColor: '#E2E8F0', paddingHorizontal: rw(14), paddingVertical: rh(12),
    fontSize: rf(15), color: '#1E293B',
  },
  locationBtn: {
    backgroundColor: '#fff', borderRadius: rw(12), borderWidth: 1.5,
    borderColor: '#E2E8F0', paddingHorizontal: rw(14), paddingVertical: rh(14),
    alignItems: 'center',
  },
  locationBtnText: { fontSize: rf(14), color: '#64748B', fontWeight: '600', textAlign: 'center' },
  // Origem: verde
  locationBtnOriginSet: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  locationBtnTextOriginSet: { color: '#2E7D32', fontWeight: '700' },
  // Destino: azul
  locationBtnDestSet: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  locationBtnTextDestSet: { color: '#1565C0', fontWeight: '700' },
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
});
