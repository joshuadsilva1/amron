import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, FlatList, useWindowDimensions } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import ControlTowerService, { ControlTowerSummary, ControlTowerOrderRow } from "@/services/controlTowerService";
import OrderService from "@/services/orderService";
import DepartmentPoService from "@/services/departmentPoService";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

const RISK_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  RED: { bg: "#FEE2E2", text: "#B91C1C", dot: "#EF4444" },
  YELLOW: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  GREEN: { bg: "#DCFCE7", text: "#166534", dot: "#22C55E" },
};

interface Tile {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  tone?: "danger" | "warning" | "default";
}

export default function ControlTowerScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday] = useState<ControlTowerSummary | null>(null);
  const [orders, setOrders] = useState<ControlTowerOrderRow[]>([]);
  const [statusPipeline, setStatusPipeline] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [statusPickerFor, setStatusPickerFor] = useState<ControlTowerOrderRow | null>(null);
  const [updatingPoId, setUpdatingPoId] = useState<string | null>(null);
  const [sendingPoId, setSendingPoId] = useState<string | null>(null);

  const { sorted: sortedOrders, sortKey, sortDir, toggleSort } = useSortable<ControlTowerOrderRow>(orders);

  const fetchData = useCallback(async () => {
    try {
      const data = await ControlTowerService.getSummary();
      setToday(data.today);
      setOrders(data.orders);
      setStatusPipeline(data.status_pipeline);
      setGeneratedAt(data.generated_at);
    } catch (error) {
      console.error("Failed to load control tower summary", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!statusPickerFor) return;
    const poId = statusPickerFor.po_id;
    setStatusPickerFor(null);
    try {
      setUpdatingPoId(poId);
      await OrderService.updateStatus(poId, newStatus);
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to update status.");
    } finally {
      setUpdatingPoId(null);
    }
  };

  // Explodes this PO's finished goods one level deep, raises/tops up one
  // internal DepartmentPO per department owing a direct component, and
  // notifies each — the "we picked it up, here's what Moulding/Brasspart
  // owe it" step.
  const handleSendToDepartments = async (row: ControlTowerOrderRow) => {
    try {
      setSendingPoId(row.po_id);
      const result = await DepartmentPoService.generateFromPO(row.po_id);
      Alert.alert("Sent", result.message || "Internal POs raised.");
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to send to departments.");
    } finally {
      setSendingPoId(null);
    }
  };

  const tiles: Tile[] = today ? [
    { label: "Active POs", value: today.total_active_pos, icon: "file-text" },
    { label: "New Today", value: today.new_today, icon: "plus-circle" },
    { label: "Urgent", value: today.urgent, icon: "zap", tone: "warning" },
    { label: "Due Today", value: today.due_today, icon: "calendar", tone: "warning" },
    { label: "Due Tomorrow", value: today.due_tomorrow, icon: "calendar" },
    { label: "Overdue", value: today.overdue, icon: "alert-triangle", tone: "danger" },
    { label: "Production Planned", value: today.production_planned_today, icon: "trending-up" },
    { label: "Production Completed", value: today.production_completed_today, icon: "check-circle" },
    { label: "Production Pending", value: today.production_pending_today, icon: "clock", tone: "warning" },
    { label: "Material Shortages", value: today.material_shortages, icon: "package", tone: "danger" },
    { label: "Quality Holds", value: today.quality_holds, icon: "shield-off", tone: "danger" },
    { label: "Supplier Pending", value: today.supplier_pending, icon: "truck", tone: "warning" },
    { label: "Dispatch Pending", value: today.dispatch_pending, icon: "send", tone: "warning" },
  ] : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Control Tower</Text>
          <Text style={styles.subtitle}>Today's factory status, at a glance.</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
          <Feather name="refresh-cw" size={16} color={colors.navy} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : (
        <>
          <View style={styles.tileGrid}>
            {tiles.map((tile) => (
              <View
                key={tile.label}
                style={[
                  styles.tile,
                  { width: isNarrow ? "48%" : "23%" },
                  tile.tone === "danger" && tile.value > 0 && styles.tileDanger,
                  tile.tone === "warning" && tile.value > 0 && styles.tileWarning,
                ]}
              >
                <Feather
                  name={tile.icon}
                  size={16}
                  color={tile.tone === "danger" && tile.value > 0 ? "#B91C1C" : tile.tone === "warning" && tile.value > 0 ? "#92400E" : "#6B7280"}
                />
                <Text style={styles.tileValue}>{tile.value}</Text>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tableSectionHeader}>
            <Text style={styles.sectionTitle}>Orders — worst risk first</Text>
            {generatedAt && (
              <Text style={styles.timestamp}>Updated {new Date(generatedAt).toLocaleTimeString()}</Text>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <SortableHeaderCell label="CUSTOMER" active={sortKey === "customer"} direction={sortDir} onPress={() => toggleSort("customer")} textStyle={styles.columnHeader} containerStyle={{ width: 150 }} />
                <SortableHeaderCell label="PRODUCT" active={sortKey === "product"} direction={sortDir} onPress={() => toggleSort("product")} textStyle={styles.columnHeader} containerStyle={{ width: 200 }} />
                <SortableHeaderCell label="QTY" active={sortKey === "quantity"} direction={sortDir} onPress={() => toggleSort("quantity")} textStyle={styles.columnHeader} containerStyle={{ width: 90 }} />
                <SortableHeaderCell label="DUE DATE" active={sortKey === "due_date"} direction={sortDir} onPress={() => toggleSort("due_date")} textStyle={styles.columnHeader} containerStyle={{ width: 110 }} />
                <SortableHeaderCell label="STAGE" active={sortKey === "current_stage"} direction={sortDir} onPress={() => toggleSort("current_stage")} textStyle={styles.columnHeader} containerStyle={{ width: 140 }} />
                <Text style={[styles.columnHeader, { width: 120 }]}>STATUS</Text>
                <Text style={[styles.columnHeader, { flex: 1, minWidth: 160 }]}>INTERNAL PO</Text>
              </View>

              {sortedOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No active orders right now.</Text>
                </View>
              ) : (
                sortedOrders.map((row) => {
                  const risk = RISK_COLORS[row.risk] || RISK_COLORS.GREEN;
                  return (
                    <View key={row.po_id} style={styles.tableRow}>
                      <View style={{ width: 150 }}>
                        <Text style={styles.cellTextBold} numberOfLines={1}>{row.customer}</Text>
                        {row.is_urgent && <Text style={styles.urgentTag}>URGENT</Text>}
                      </View>
                      <Text style={[styles.cellText, { width: 200 }]} numberOfLines={1}>{row.product}</Text>
                      <View style={{ width: 90 }}>
                        <Text style={styles.cellText}>{row.produced_qty}/{row.quantity}</Text>
                        <Text style={styles.cellSubtext}>dispatched {row.dispatched_qty}</Text>
                      </View>
                      <Text style={[styles.cellText, { width: 110 }]}>
                        {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                      </Text>
                      <Pressable
                        style={{ width: 140 }}
                        onPress={() => setStatusPickerFor(row)}
                        disabled={updatingPoId === row.po_id}
                      >
                        {updatingPoId === row.po_id ? (
                          <ActivityIndicator size="small" color="#8B5CF6" />
                        ) : (
                          <View style={styles.stagePill}>
                            <Text style={styles.stagePillText} numberOfLines={1}>{row.current_stage}</Text>
                            <Feather name="chevron-down" size={12} color="#6B7280" />
                          </View>
                        )}
                      </Pressable>
                      <View style={{ width: 120 }}>
                        <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                          <View style={[styles.riskDot, { backgroundColor: risk.dot }]} />
                          <Text style={[styles.riskText, { color: risk.text }]}>
                            {row.risk === "RED" ? "Delayed" : row.risk === "YELLOW" ? "At Risk" : "On Track"}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, minWidth: 160 }}>
                        <Pressable
                          style={styles.sendDeptBtn}
                          onPress={() => handleSendToDepartments(row)}
                          disabled={sendingPoId === row.po_id}
                        >
                          {sendingPoId === row.po_id ? (
                            <ActivityIndicator size="small" color="#8B5CF6" />
                          ) : (
                            <>
                              <Feather name="send" size={12} color="#8B5CF6" style={{ marginRight: 6 }} />
                              <Text style={styles.sendDeptBtnText}>Send to departments</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </>
      )}

      {/* Status change picker */}
      <Modal visible={!!statusPickerFor} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setStatusPickerFor(null)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>
              {statusPickerFor?.customer} — {statusPickerFor?.product}
            </Text>
            <FlatList
              data={statusPipeline}
              keyExtractor={(s) => s}
              renderItem={({ item }) => (
                <Pressable style={styles.pickerOption} onPress={() => handleChangeStatus(item)}>
                  <Text style={[styles.pickerOptionText, statusPickerFor?.current_stage === item && styles.pickerOptionActive]}>
                    {item}
                  </Text>
                  {statusPickerFor?.current_stage === item && <Feather name="check" size={18} color="#8B5CF6" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.xl },
  title: { fontSize: 30, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280" },
  refreshBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl },
  tile: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: spacing.md, minWidth: 140 },
  tileDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  tileWarning: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  tileValue: { fontSize: 26, fontWeight: "800", color: "#111111", marginTop: 8 },
  tileLabel: { fontSize: 12, color: "#6B7280", marginTop: 2, fontWeight: "600" },

  tableSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  timestamp: { fontSize: 12, color: "#9CA3AF" },

  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 970, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 14, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },

  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 13, color: "#374151" },
  cellTextBold: { fontSize: 13, fontWeight: "700", color: "#111111" },
  cellSubtext: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  urgentTag: { fontSize: 10, fontWeight: "800", color: "#B91C1C", marginTop: 2 },

  stagePill: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F3F4F6", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: "flex-start" },
  stagePillText: { fontSize: 12, fontWeight: "600", color: "#374151", marginRight: 4 },

  riskBadge: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: "flex-start" },
  riskDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  riskText: { fontSize: 12, fontWeight: "700" },

  sendDeptBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, alignSelf: "flex-start" },
  sendDeptBtnText: { fontSize: 12, fontWeight: "600", color: "#8B5CF6" },

  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyStateText: { fontSize: 14, color: "#9CA3AF" },

  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  pickerModal: { width: "100%", maxWidth: 400, maxHeight: "70%", backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  pickerTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  pickerOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerOptionText: { fontSize: 15, color: "#374151" },
  pickerOptionActive: { color: "#8B5CF6", fontWeight: "700" },
});
