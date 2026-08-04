import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import NotificationService, { NotificationItem } from "@/services/notificationService";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  const handleMarkAllRead = async () => {
    try {
      setMarkingRead(true);
      await NotificationService.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      Alert.alert("Error", "Failed to mark notifications as read.");
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Feather name="bell" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Alerts and messages across departments.
            </Text>
          </View>
          {hasUnread && (
            <Pressable style={styles.markReadBtn} onPress={handleMarkAllRead} disabled={markingRead}>
              <Text style={styles.markReadBtnText}>{markingRead ? "Marking..." : "Mark all read"}</Text>
            </Pressable>
          )}
        </View>

        {/* Content Box Container */}
        <View style={styles.contentBox}>
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No notifications yet.</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <View key={item.id} style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifMessage}>{item.message}</Text>
                </View>
                <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { flexGrow: 1, padding: spacing.xl },
  
  // --- Header ---
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xxl },
  markReadBtn: { backgroundColor: "#111111", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  markReadBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  iconBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(139, 92, 246, 0.1)", alignItems: "center", justifyContent: "center", marginRight: spacing.lg },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280" },

  // --- Main Content Box ---
  contentBox: { flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 400 },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  emptyStateText: { fontSize: 15, color: "#6B7280" },

  // Populated Items
  notificationCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  unreadCard: { backgroundColor: "#F5F3FF" },
  notifTitle: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 4 },
  notifMessage: { fontSize: 14, color: "#4B5563" },
  notifTime: { fontSize: 12, color: "#9CA3AF" },
});