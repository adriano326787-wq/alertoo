import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { EventComment } from '../types/entertainment';
import { timeAgo } from '../utils/time';
import { getCurrentUserId, getCurrentUser } from '../services/authService';
import { useT } from '../hooks/useT';
import { useTick } from '../hooks/useTick';

interface Props {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export function CommentsModal({ visible, eventId, eventTitle, onClose }: Props) {
  const t = useT();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(0); // #15 — seconds left in cooldown
  const isMounted = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // #1 — tick forces re-render so timeAgo() stays fresh
  useTick(60_000);
  const { addComment } = useEntertainmentStore();
  const myUid = getCurrentUserId();
  const currentUser = getCurrentUser();
  const isAnonymous = !currentUser || currentUser.isAnonymous || myUid === 'anonymous';

  // #37 — real-time comments via onSnapshot; #13 — isMounted guard prevents state update after unmount
  useEffect(() => {
    if (!visible || !eventId) return;
    isMounted.current = true;
    setLoading(true);
    setComments([]);

    // #16 — limit to 50 most recent comments to cap read costs
    const q = query(
      collection(db, 'entertainment_events', eventId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!isMounted.current) return;
      const loaded: EventComment[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          eventId,
          userId: data.userId ?? '',
          displayName: data.displayName ?? t('comments_anonymous_user'),
          text: data.text ?? '',
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        } as EventComment;
      });
      setComments(loaded);
      setLoading(false);
    }, () => {
      if (isMounted.current) setLoading(false);
    });

    return () => {
      isMounted.current = false;
      unsub();
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [visible, eventId]);

  const handleSend = async () => {
    if (!text.trim()) return;

    if (isAnonymous) {
      Alert.alert(
        t('login_required') || 'Login necessário',
        t('comment_login_msg') || 'Faça login para comentar nos eventos.',
        [{ text: 'OK' }]
      );
      return;
    }

    const draft = text.trim();
    setSending(true);
    try {
      await addComment(eventId, draft);
      setText('');
      // #15 — start 30s visual cooldown so user sees rate-limit feedback
      setSendCooldown(30);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        setSendCooldown((n) => {
          if (n <= 1) { clearInterval(cooldownRef.current!); return 0; }
          return n - 1;
        });
      }, 1000);
    } catch (err: any) {
      // #14 — exibe a mensagem real do erro (ex: "Aguarde Xs" do rate limit)
      // em vez de uma mensagem genérica que não informa o usuário
      Alert.alert(
        t('error') || 'Erro',
        err?.message || t('comment_send_error') || 'Não foi possível enviar o comentário. Tente novamente.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 12) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('comments_title')}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{eventTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel={t('close') || 'Fechar'} accessibilityRole="button">
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color="#6A1B9A" />
          ) : comments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('comments_empty')}</Text>
              <Text style={styles.emptyHint}>{t('comments_empty_hint')}</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isMe = item.userId === myUid;
                return (
                  <View style={[styles.commentRow, isMe && styles.commentRowMe]}>
                    <Text style={[styles.authorName, isMe && styles.authorNameMe]}>
                      {isMe ? (t('you') || 'Você') : item.displayName}
                    </Text>
                    <View style={[styles.commentBubble, isMe && styles.myBubble]}>
                      <Text style={[styles.commentText, isMe && styles.myCommentText]}>
                        {item.text}
                      </Text>
                      <Text style={[styles.commentTime, isMe && styles.myCommentTime]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {isAnonymous ? (
            <View style={styles.anonBanner}>
              <Text style={styles.anonText}>
                🔒 {t('comment_login_msg') || 'Faça login para comentar nos eventos.'}
              </Text>
            </View>
          ) : (
            <View>
              {/* #14 — character counter */}
              {text.length > 0 && (
                <Text style={styles.charCounter}>{text.length}/300</Text>
              )}
              {/* #15 — cooldown banner */}
              {sendCooldown > 0 && (
                <Text style={styles.cooldownText}>
                  ⏳ {t('comment_cooldown').replace('{n}', String(sendCooldown))}
                </Text>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={t('comments_placeholder')}
                  placeholderTextColor="#aaa"
                  value={text}
                  onChangeText={setText}
                  maxLength={300}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!text.trim() || sending || sendCooldown > 0) && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending || sendCooldown > 0}
                  accessibilityLabel={t('send_comment') || 'Enviar comentário'}
                  accessibilityRole="button"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : sendCooldown > 0 ? (
                    <Text style={styles.sendCooldownText}>{sendCooldown}</Text>
                  ) : (
                    <Text style={styles.sendText}>➤</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: 16,
    // paddingBottom é definido inline com o safe area inset para respeitar a barra de navegação do celular
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerText: { flex: 1, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  closeBtn: { fontSize: 18, color: '#888', padding: 4 },
  loader: { marginVertical: 32 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555' },
  emptyHint: { fontSize: 13, color: '#aaa', marginTop: 4 },
  list: { paddingVertical: 8, gap: 10 },
  commentRow: { alignItems: 'flex-start' },
  commentRowMe: { alignItems: 'flex-end' },
  authorName: { fontSize: 12, fontWeight: '700', color: '#6A1B9A', marginBottom: 3, marginLeft: 4 },
  authorNameMe: { color: '#6A1B9A', marginLeft: 0, marginRight: 4 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 10 },
  loadMoreText: { fontSize: 13, color: '#6A1B9A', fontWeight: '600' },
  anonBanner: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee',
    alignItems: 'center', paddingVertical: 14, backgroundColor: '#F3E5F5',
    borderRadius: 12, paddingHorizontal: 16,
  },
  anonText: { fontSize: 13, color: '#6A1B9A', textAlign: 'center', fontWeight: '500' },
  commentBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 14, borderBottomLeftRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: '80%',
  },
  myBubble: { backgroundColor: '#6A1B9A', borderBottomLeftRadius: 14, borderBottomRightRadius: 4 },
  commentText: { fontSize: 14, color: '#1a1a1a' },
  myCommentText: { color: '#fff' },
  commentTime: { fontSize: 11, color: '#888', marginTop: 4 },
  myCommentTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#1a1a1a',
    maxHeight: 100, textAlignVertical: 'top',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6A1B9A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendText: { color: '#fff', fontSize: 16 },
  sendCooldownText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  charCounter: { fontSize: 11, color: '#aaa', textAlign: 'right', marginBottom: 2, paddingRight: 2 },
  cooldownText: { fontSize: 12, color: '#888', marginBottom: 4, paddingHorizontal: 4 },
});
