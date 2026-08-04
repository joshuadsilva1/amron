import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Modal, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import ChatService, { ChatChannelSummary, ChatUser } from "@/services/chatService";

const POLL_INTERVAL_MS = 8000;

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ChatInboxScreen() {
  const [channels, setChannels] = useState<ChatChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState<ChatUser[]>([]);

  // New chat modal
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"pick" | "group">("pick");
  const [search, setSearch] = useState("");
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchChannels = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await ChatService.getChannels();
      setChannels(data);
    } catch (error) {
      console.warn("Failed to fetch chat channels", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChannels(true);
      const interval = setInterval(() => fetchChannels(false), POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchChannels])
  );

  const openNewChatModal = async () => {
    setMode("pick");
    setSearch("");
    setSelectedForGroup([]);
    setGroupName("");
    setModalVisible(true);
    try {
      const users = await ChatService.getDirectory();
      setDirectory(users);
    } catch (error) {
      Alert.alert("Error", "Failed to load the user directory.");
    }
  };

  const handlePickUser = async (user: ChatUser) => {
    try {
      setSubmitting(true);
      const channelId = await ChatService.openDM(user.id);
      setModalVisible(false);
      router.push({ pathname: "/(protected)/chat/[id]", params: { id: channelId, name: user.name, type: "DM" } });
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to start chat.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedForGroup((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Missing Name", "Give the group a name.");
      return;
    }
    if (selectedForGroup.length === 0) {
      Alert.alert("Missing Members", "Pick at least one other member.");
      return;
    }
    try {
      setSubmitting(true);
      const channelId = await ChatService.createGroup(groupName.trim(), selectedForGroup);
      setModalVisible(false);
      router.push({ pathname: "/(protected)/chat/[id]", params: { id: channelId, name: groupName.trim(), type: "GROUP" } });
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create group.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDirectory = directory.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>Message anyone in the system.</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={openNewChatModal}>
          <Feather name="edit" size={16} color={colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.newBtnText}>New Chat</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.channel_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No conversations yet</Text>
              <Text style={styles.emptyStateText}>Tap "New Chat" to message someone.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.channelCard}
              onPress={() =>
                router.push({
                  pathname: "/(protected)/chat/[id]",
                  params: { id: item.channel_id, name: item.name, type: item.type },
                })
              }
            >
              <View style={styles.iconWrapper}>
                <Feather name={item.type === "GROUP" ? "users" : "user"} size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.channelPreview} numberOfLines={1}>
                  {item.last_message || "No messages yet"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.channelTime}>{timeAgo(item.last_message_at)}</Text>
                {item.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      {/* New Chat / New Group Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{mode === "pick" ? "New Chat" : "New Group"}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.modeToggle}>
              <Pressable
                style={[styles.modeBtn, mode === "pick" && styles.modeBtnActive]}
                onPress={() => setMode("pick")}
              >
                <Text style={[styles.modeBtnText, mode === "pick" && styles.modeBtnTextActive]}>Direct Message</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === "group" && styles.modeBtnActive]}
                onPress={() => setMode("group")}
              >
                <Text style={[styles.modeBtnText, mode === "group" && styles.modeBtnTextActive]}>New Group</Text>
              </Pressable>
            </View>

            {mode === "group" && (
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group name..."
                placeholderTextColor="#9CA3AF"
                value={groupName}
                onChangeText={setGroupName}
              />
            )}

            <TextInput
              style={styles.searchInput}
              placeholder="Search people..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />

            <FlatList
              data={filteredDirectory}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.dropdownEmptyText}>No users found.</Text>}
              renderItem={({ item }) => {
                const isSelected = selectedForGroup.includes(item.id);
                return (
                  <Pressable
                    style={styles.userRow}
                    onPress={() => (mode === "pick" ? handlePickUser(item) : toggleGroupMember(item.id))}
                    disabled={submitting}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{item.name}</Text>
                      {item.role_name && <Text style={styles.userRole}>{item.role_name}</Text>}
                    </View>
                    {mode === "group" && (
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Feather name="check" size={12} color={colors.white} />}
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />

            {mode === "group" && (
              <Pressable
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleCreateGroup}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Group ({selectedForGroup.length})</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  newBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  newBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  listContent: { paddingBottom: 40 },
  channelCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 16, marginBottom: 10 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 14 },
  channelName: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 2 },
  channelPreview: { fontSize: 13, color: "#6B7280" },
  channelTime: { fontSize: 12, color: "#9CA3AF", marginBottom: 6 },
  unreadBadge: { backgroundColor: "#8B5CF6", minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadBadgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: "#9CA3AF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#111111" },
  closeIcon: { padding: 4 },

  modeToggle: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  modeBtnActive: { backgroundColor: "#111111" },
  modeBtnText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  modeBtnTextActive: { color: colors.white },

  groupNameInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 14, fontSize: 15, color: "#111111", marginBottom: 10 },
  searchInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 14, fontSize: 15, color: "#111111", marginBottom: 12 },
  dropdownEmptyText: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },

  userRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 12 },
  userAvatarText: { color: "#8B5CF6", fontWeight: "700", fontSize: 14 },
  userName: { fontSize: 15, fontWeight: "600", color: "#111111" },
  userRole: { fontSize: 12, color: "#9CA3AF" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },

  submitBtn: { backgroundColor: "#8B5CF6", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
