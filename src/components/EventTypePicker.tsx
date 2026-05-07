import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  onSelectRoad: () => void;
  onSelectEntertainment: () => void;
  onClose: () => void;
}

export function EventTypePicker({ visible, onSelectRoad, onSelectEntertainment, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>O que deseja reportar?</Text>
          <Text style={styles.subtitle}>Selecione o tipo de evento</Text>

          <TouchableOpacity style={styles.option} onPress={onSelectRoad} activeOpacity={0.8}>
            <View style={[styles.optionIcon, { backgroundColor: '#E53935' }]}>
              <Text style={styles.optionEmoji}>🚗</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Alerta de Estrada</Text>
              <Text style={styles.optionDesc}>Acidentes, obras, blitz, alagamentos...</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onSelectEntertainment} activeOpacity={0.8}>
            <View style={[styles.optionIcon, { backgroundColor: '#6A1B9A' }]}>
              <Text style={styles.optionEmoji}>🎉</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Evento de Entretenimento</Text>
              <Text style={styles.optionDesc}>Bares, restaurantes, festas, shows...</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', marginBottom: 12,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionEmoji: { fontSize: 24 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  optionDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  optionArrow: { fontSize: 22, color: '#bbb', fontWeight: '300' },
  cancelBtn: { marginTop: 4, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888' },
});
