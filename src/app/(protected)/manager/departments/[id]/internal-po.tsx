import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import DepartmentPoService, { DepartmentPO } from "@/services/departmentPoService";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#D97706" },
  In_Progress: { bg: "#DBEAFE", text: "#2563EB" },
  Fulfilled: { bg: "#ECFDF5", text: "#10B981" },
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending",
  In_Progress: "In Progress",
  Fulfilled: "Fulfilled",
};

export default function InternalPOPage() {
  const { id } = useLocalSearchParams();
  const departmentId = String(id || "");
  const [departmentName, setDepartmentName] = useState("Loading...");

  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<DepartmentPO[]>([]);
  const [showFulfilled, setShowFulfilled] = useState(false);

  const fetchData = useCallback(async () => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const [deptsRes, dpos] = await Promise.all([
        api.get("/departments/"),
        DepartmentPoService.getDepartmentPOs(departmentId).catch(() => []),
      ]);
      const allDepts = deptsRes.data?.data || deptsRes.data || [];
      const currentDept = allDepts.find((d: any) => String(d.id) === departmentId);
      setDepartmentName(currentDept?.name || "Unknown Department");
      setPos(dpos);
    } catch (error) {
      console.warn("Failed to load internal POs:", error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visiblePos = pos.filter((p) => showFulfilled || p.status !== "Fulfilled");

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{departmentName} — Internal PO</Text>
            <Text style={styles.subtitle}>
              What this department owes toward customer POs — raised from each PO's recipe. There's no manual
              "approve": a line only moves once you actually log that production, on the Log Production screen.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.toggleBtn} onPress={() => setShowFulfilled((v) => !v)}>
              <Feather name={showFulfilled ? "eye-off" : "eye"} size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.toggleBtnText}>{showFulfilled ? "Hide fulfilled" : "Show fulfilled"}</Text>
            </Pressable>
            <Pressable
              style={styles.produceBtn}
              onPress={() => router.push(`/(protected)/manager/departments/${departmentId}/produce` as any)}
            >
              <Feather name="cpu" size={16} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.produceBtnText}>Log production</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : visiblePos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {pos.length === 0
                ? "Nothing raised for this department yet. It shows up here the moment a production manager sends a customer PO to departments."
                : "Nothing pending — everything raised so far has been fulfilled."}
            </Text>
          </View>
        ) : (
          visiblePos.map((dpo) => {
            const statusStyle = STATUS_COLORS[dpo.status] || STATUS_COLORS.Pending;
            return (
              <View key={dpo.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Internal PO {dpo.source_po_id ? `· from PO ${dpo.source_po_id.slice(0, 8)}` : ""}
                      {dpo.is_urgent && <Text style={styles.urgentTag}>  URGENT</Text>}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Raised {dpo.created_at ? new Date(dpo.created_at).toLocaleString() : "—"}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                      {STATUS_LABELS[dpo.status] || dpo.status}
                    </Text>
                  </View>
                </View>

                {dpo.items.map((item) => {
                  const pct = item.quantity_requested > 0
                    ? Math.min(100, Math.round((item.quantity_fulfilled / item.quantity_requested) * 100))
                    : 0;
                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemName}>{item.component_name || item.component_id}</Text>
                        <Text style={styles.itemCode}>{item.component_code}</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` }, pct >= 100 && styles.progressFillDone]} />
                      </View>
                      <Text style={styles.itemQty}>
                        {item.quantity_fulfilled} / {item.quantity_requested} {item.unit_of_measure}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },

  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: Platform.OS === "web" ? "flex-start" : "stretch", marginBottom: spacing.xl, gap: 16 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20 },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  toggleBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  produceBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  produceBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111111" },
  cardMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  urgentTag: { fontSize: 11, fontWeight: "800", color: "#EF4444" },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  itemRow: { marginBottom: 14 },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#111111" },
  itemCode: { fontSize: 12, color: "#9CA3AF" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#F3F4F6", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#8B5CF6", borderRadius: 4 },
  progressFillDone: { backgroundColor: "#10B981" },
  itemQty: { fontSize: 12, color: "#6B7280", marginTop: 4, textAlign: "right" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 100, justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
});
