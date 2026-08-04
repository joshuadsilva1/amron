import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect, Stack } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import useAuthStore from "@/store/authStore";
import ChatService, { ChatMessage } from "@/services/chatService";

const POLL_INTERVAL_MS = 4000;

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatConversationScreen() {
  const { id, name, type } = useLocalSearchParams<{ id: string; name?: string; type?: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const scrollToBottom = (animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 50);
  };

  const fetchInitial = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await ChatService.getMessages(id);
      setMessages(data);
      await ChatService.markRead(id);
      scrollToBottom(false);
    } catch (error) {
      console.warn("Failed to load messages", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const pollNewMessages = useCallback(async () => {
    if (!id) return;
    const current = messagesRef.current;
    const lastId = current.length > 0 ? current[current.length - 1].id : undefined;
    try {
      const fresh = await ChatService.getMessages(id, lastId);
      if (fresh.length > 0) {
        setMessages((prev) => [...prev, ...fresh]);
        await ChatService.markRead(id);
        scrollToBottom(true);
      }
    } catch (error) {
      console.warn("Failed to poll messages", error);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchInitial();
      const interval = setInterval(pollNewMessages, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchInitial, pollNewMessages])
  );

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !id) return;
    setDraft("");
    try {
      setSending(true);
      const sent = await ChatService.sendMessage(id, body);
      setMessages((prev) => [...prev, sent]);
      scrollToBottom(true);
    } catch (error: any) {
      console.warn("Failed to send message", error);
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#111111" />
        </Pressable>
        <View style={styles.headerIconWrapper}>
          <Feather name={type === "GROUP" ? "users" : "user"} size={18} color="#8B5CF6" />
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>{name || "Chat"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageListContent}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet. Say hello!</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <View key={msg.id} style={[styles.messageRow, isMine && styles.messageRowMine]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!isMine && type === "GROUP" && (
                      <Text style={styles.senderName}>{msg.sender_name}</Text>
                    )}
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.body}</Text>
                    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(msg.created_at)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          <Feather name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  header: { flexDirection: "row", alignItems: "center", padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: "#E5E7EB" },
  backBtn: { marginRight: 12 },
  headerIconWrapper: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111111", flex: 1 },

  messageList: { flex: 1 },
  messageListContent: { padding: spacing.lg, paddingBottom: spacing.xl },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyStateText: { fontSize: 14, color: "#9CA3AF" },

  messageRow: { flexDirection: "row", marginBottom: 10 },
  messageRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleTheirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: "#8B5CF6", borderBottomRightRadius: 4 },
  senderName: { fontSize: 11, fontWeight: "700", color: "#8B5CF6", marginBottom: 3 },
  bubbleText: { fontSize: 15, color: "#111111", lineHeight: 20 },
  bubbleTextMine: { color: colors.white },
  bubbleTime: { fontSize: 10, color: "#9CA3AF", marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  input: { flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: "#111111", maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#D1D5DB" },
});
