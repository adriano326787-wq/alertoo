import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useEntertainmentStore } from '../store/entertainmentStore';
import { EventComment } from '../types/entertainment';
import { timeAgo } from '../utils/time';
import { getCurrentUserId } from '../services/authService';

interface Props {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export function CommentsModal({ visible, eventId, eventTitle, onClose }: Props) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { fetchComments, addComment } = useEntertainmentStore();
  const myUid = getCurrentUserId();

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchComments(eventId).then((c) => { setComments(c); setLoading(false); });
  }, [visible, eventId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await addComment(eventId, text.trim());
    const updated = await fetchComments(eventId);
    setComments(updated);
    setText('');
    setSending(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Comentários</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{eventTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color="#6A1B9A" />
          ) : comments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum comentário ainda.</Text>
              <Text style={styles.emptyHint}>Seja o primeiro a comentar!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const isMe = item.userId === myUid;
                return (
                  <View style={[styles.commentRow, isMe && styles.commentRowMe]}>
                    {!isMe && (
                      <Text style={styles.authorName}>{item.displayName}</Text>
                    )}
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

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escreva um comentário..."
              placeholderTextColor="#aaa"
              value={text}
              onChangeText={setText}
              maxLength={300}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
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
});
