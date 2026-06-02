import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCurrentUserId, getCurrentUser } from '../services/authService';
import { useT } from '../hooks/useT';

interface Props {
  visible: boolean;
  eventId: string;
  eventType: 'entertainment' | 'road';
  onClose: () => void;
}

const REASONS = [
  'report_reason_nudity',
  'report_reason_violence',
  'report_reason_spam',
  'report_reason_other',
] as const;

export function ReportModal({ visible, eventId, eventType, onClose }: Props) {
  const t = useT();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const currentUser = getCurrentUser();
  const myUid = getCurrentUserId();
  const isAnonymous = !currentUser || currentUser.isAnonymous || myUid === 'anonymous';

  const handleClose = () => {
    setSelectedReason(null);
    setNote('');
    onClose();
  };

  const handleSend = async () => {
    if (!selectedReason) return;

    if (isAnonymous || !myUid) {
      Alert.alert(t('login_required'), t('report_login_required'), [{ text: 'OK' }]);
      return;
    }

    setSending(true);
    try {
      // Chave composta garante atomicidade — elimina race condition de double-tap
      const reportDocRef = doc(db, 'reports', `${myUid}_${eventId}`);
      const existing = await getDoc(reportDocRef);
      if (existing.exists()) {
        Alert.alert(t('error'), t('report_already_sent'), [{ text: 'OK' }]);
        handleClose();
        return;
      }

      await setDoc(reportDocRef, {
        eventId,
        eventType,
        reporterId: myUid,
        reason: selectedReason,
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        t('report_success_title'),
        t('report_success_msg'),
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (err: any) {
      Alert.alert(t('error'), err?.message ?? t('report_failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>⚑ {t('report_event')}</Text>
            <TouchableOpacity onPress={handleClose} accessibilityRole="button" accessibilityLabel={t('close')}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>{t('report_reason_title')}</Text>

          {REASONS.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.reasonRow, selectedReason === key && styles.reasonRowSelected]}
              onPress={() => setSelectedReason(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, selectedReason === key && styles.radioSelected]}>
                {selectedReason === key && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonText, selectedReason === key && styles.reasonTextSelected]}>
                {t(key)}
              </Text>
            </TouchableOpacity>
          ))}

          <TextInput
            style={styles.noteInput}
            placeholder={t('report_note_placeholder')}
            placeholderTextColor="#aaa"
            value={note}
            onChangeText={setNote}
            maxLength={300}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!selectedReason || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selectedReason || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendText}>{t('report_send')}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '700', color: '#C62828' },
  closeBtn: { fontSize: 18, color: '#888', padding: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#eee',
    marginBottom: 8,
    gap: 12,
  },
  reasonRowSelected: { borderColor: '#C62828', backgroundColor: '#FFF5F5' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#C62828' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C62828' },
  reasonText: { fontSize: 14, color: '#333', flex: 1 },
  reasonTextSelected: { fontWeight: '600', color: '#C62828' },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 72,
    maxHeight: 120,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 16,
  },
  sendBtn: {
    backgroundColor: '#C62828',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
