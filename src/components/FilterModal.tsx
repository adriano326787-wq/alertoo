import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useEventsStore } from '../store/eventsStore';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { useAppStore } from '../store/appStore';
import { BRAZIL_STATES } from '../utils/brazilGeo';
import { getRegionLabel, getCityLabel, tEntCat } from '../utils/i18n';
import { useT } from '../hooks/useT';
import { ENTERTAINMENT_CATEGORIES, EntertainmentCategory } from '../types/entertainment';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FilterModal({ visible, onClose }: Props) {
  const t = useT();
  const { events, filterStateUF, filterCityName, setFilter } = useEventsStore();
  const entEvents = useEntertainmentStore((s) => s.events);
  const userCountryCode = useAppStore((s) => s.userCountryCode);

  const [tempState, setTempState] = useState<string | null>(filterStateUF);
  const [tempCity, setTempCity] = useState<string | null>(filterCityName);
  const [tempCategory, setTempCategory] = useState<EntertainmentCategory | null>(null);

  // ─── Regiões dinâmicas extraídas dos eventos carregados ───────────────────
  const availableRegions = useMemo(() => {
    const seen = new Set<string>();
    events.forEach((e) => { if (e.stateUF) seen.add(e.stateUF); });
    return [...seen].sort();
  }, [events]);

  // Para Brasil: busca cidades da lista estática quando a região é um UF conhecido
  const selectedBrazilState = userCountryCode === 'BR' || !userCountryCode
    ? BRAZIL_STATES.find((s) => s.uf === tempState)
    : undefined;

  // Rótulos adaptativos ao país
  const regionLabel = getRegionLabel(userCountryCode);
  const cityPrefix = getCityLabel(userCountryCode);

  const handleApply = () => {
    setFilter(tempState, tempCity);
    onClose();
  };

  // Categorias disponíveis nos eventos atuais
  const availableCategories = useMemo(() => {
    const seen = new Set<EntertainmentCategory>();
    entEvents.forEach((e) => seen.add(e.category));
    return [...seen].sort();
  }, [entEvents]);

  const handleClear = () => {
    setTempState(null);
    setTempCity(null);
    setTempCategory(null);
    setFilter(null, null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('filter_title')}</Text>
            {(filterStateUF || filterCityName) && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>{t('filter_clear')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ─── Região / Estado ─────────────────────────────── */}
          <Text style={styles.sectionLabel}>{regionLabel}</Text>

          {availableRegions.length === 0 ? (
            <Text style={styles.emptyRegions}>{t('filter_no_regions')}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              {availableRegions.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[styles.chip, tempState === region && styles.chipSelected]}
                  onPress={() => {
                    const next = tempState === region ? null : region;
                    setTempState(next);
                    setTempCity(null);
                  }}
                >
                  <Text style={[styles.chipText, tempState === region && styles.chipTextSelected]}>
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ─── Cidades (só para BR onde temos a lista estática) ─ */}
          {selectedBrazilState && selectedBrazilState.cities.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                {cityPrefix} {selectedBrazilState.name}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                style={styles.chipScroll}
              >
                {selectedBrazilState.cities.map((city) => (
                  <TouchableOpacity
                    key={city.name}
                    style={[styles.chip, tempCity === city.name && styles.chipSelected]}
                    onPress={() => setTempCity(tempCity === city.name ? null : city.name)}
                  >
                    <Text style={[styles.chipText, tempCity === city.name && styles.chipTextSelected]}>
                      {city.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* ─── Categoria de entretenimento (#9) ──────────────── */}
          {availableCategories.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('filter_category') || 'Categoria de evento'}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                style={styles.chipScroll}
              >
                {availableCategories.map((cat) => {
                  const meta = ENTERTAINMENT_CATEGORIES[cat];
                  const selected = tempCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, selected && { backgroundColor: meta.color, borderColor: meta.color }]}
                      onPress={() => setTempCategory(selected ? null : cat)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {meta.emoji} {tEntCat(cat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* ─── Preview do filtro selecionado ─────────────────── */}
          {tempState && (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>{t('filter_showing')}</Text>
              <Text style={styles.previewValue}>
                {tempCity
                  ? `${tempCity} — ${tempState}`
                  : `${t('filter_whole_region')} ${selectedBrazilState?.name ?? tempState}`}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('filter_cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>{t('filter_apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  clearText: { fontSize: 14, color: '#E53935', fontWeight: '600' },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  emptyRegions: { fontSize: 13, color: '#bbb', marginBottom: 16, fontStyle: 'italic' },
  chipScroll: { marginBottom: 16 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextSelected: { color: '#fff' },
  previewBox: { backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 20 },
  previewLabel: { fontSize: 12, color: '#1565C0', marginBottom: 2 },
  previewValue: { fontSize: 15, fontWeight: '700', color: '#1565C0' },
  footer: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#1565C0', alignItems: 'center' },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
