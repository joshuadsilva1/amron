import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, FlatList, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import ProductionService, { PlanDayResponse, PlanDayLine } from "@/services/productionService";

const PLAN_STATUSES = ["Draft", "Validated", "Approved", "Released"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft: { bg: "#F3F4F6", text: "#6B7280" },
  Validated: { bg: "#DBEAFE", text: "#2563EB" },
  Approved: { bg: "#FEF3C7", text: "#D97706" },
  Released: { bg: "#DCFCE7", text: "#166534" },
};

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

const SelectInput = ({ placeholder, options, onSelect }: any) => {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable style={styles.selectBox} onPress={() => setVisible(true)}>
        <Text style={styles.selectText}>{placeholder}</Text>
        <Feather name="chevron-down" size={14} color="#6B7280" />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setVisible(false)}>
          <View style={styles.pickerModal}>
            <FlatList
              data={options || []}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.pickerOption} onPress={() => { onSelect(item); setVisible(false); }}>
                  <Text style={styles.pickerOptionText}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.pickerEmpty}>Nothing to select.</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default function ProductionPlanningScreen() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plan, setPlan] = useState<PlanDayResponse | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newProduct, setNewProduct] = useState<any>(null);
  const [newDept, setNewDept] = useState<any>(null);
  const [newQty, setNewQty] = useState("");
  const [newUrgent, setNewUrgent] = useState(false);
  const [submittingRow, setSubmittingRow] = useState(false);

  const [completeTarget, setCompleteTarget] = useState<PlanDayLine | null>(null);
  const [completeQty, setCompleteQty] = useState("");
  const [completeReason, setCompleteReason] = useState<string | null>(null);

  const fetchPlan = useCallback(async (date: string) => {
    try {
      const data = await ProductionService.getPlanDay(date);
      setPlan(data);
    } catch (error) {
      console.error("Failed to load plan day", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPlan(selectedDate);
  }, [selectedDate, fetchPlan]);

  useEffect(() => {
    Promise.all([api.get("/items"), api.get("/departments")])
      .then(([itemsRes, deptsRes]) => {
        setItems(itemsRes.data?.data || []);
        setDepartments(deptsRes.data?.data || []);
      })
      .catch(() => {});
  }, []);

  const shiftDate = (deltaDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(toDateStr(d));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlan(selectedDate);
  };

  const advanceStatus = async () => {
    if (!plan) return;
    const currentIndex = PLAN_STATUSES.indexOf(plan.plan_status);
    const next = PLAN_STATUSES[currentIndex + 1];
    if (!next) return;
    try {
      setUpdatingStatus(true);
      await ProductionService.setPlanDayStatus(selectedDate, next);
      await fetchPlan(selectedDate);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to update plan status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddRow = async () => {
    if (!newProduct || !newDept || !newQty) {
      Alert.alert("Missing info", "Select a product, department, and quantity.");
      return;
    }
    try {
      setSubmittingRow(true);
      await ProductionService.createPlan({
        production_date: selectedDate,
        product_id: newProduct.id,
        department_name: newDept.name,
        target_quantity: parseInt(newQty, 10),
        priority: newUrgent ? "Urgent" : "Normal",
      });
      setAddModalVisible(false);
      setNewProduct(null);
      setNewDept(null);
      setNewQty("");
      setNewUrgent(false);
      fetchPlan(selectedDate);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || error.message || "Failed to add row.");
    } finally {
      setSubmittingRow(false);
    }
  };

  const openCompleteModal = (line: PlanDayLine) => {
    setCompleteTarget(line);
    setCompleteQty(String(line.completed_quantity));
    setCompleteReason(line.variance_reason || null);
  };

  const submitComplete = async () => {
    if (!completeTarget) return;
    const qty = parseInt(completeQty, 10) || 0;
    const short = qty < completeTarget.target_quantity;
    if (short && !completeReason) {
      Alert.alert("Reason required", "This is short of target — pick a reason before marking it complete.");
      return;
    }
    try {
      await ProductionService.updatePlan(completeTarget.plan_id, {
        completed_quantity: qty,
        status: "Completed",
        variance_reason: completeReason || undefined,
      });
      setCompleteTarget(null);
      fetchPlan(selectedDate);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to update.");
    }
  };

  const handleDeleteRow = async (planId: string) => {
    try {
      await ProductionService.deletePlan(planId);
      fetchPlan(selectedDate);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to delete.");
    }
  };

  const statusStyle = plan ? STATUS_COLORS[plan.plan_status] || STATUS_COLORS.Draft : STATUS_COLORS.Draft;
  const nextStatus = plan ? PLAN_STATUSES[PLAN_STATUSES.indexOf(plan.plan_status) + 1] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Production Planning</Text>
          <Text style={styles.subtitle}>What can actually be produced — checked against real material availability.</Text>
        </View>
      </View>

      {/* Date navigator + plan status */}
      <View style={styles.dateBar}>
        <Pressable style={styles.dateArrow} onPress={() => shiftDate(-1)}>
          <Feather name="chevron-left" size={18} color="#374151" />
        </Pressable>
        <Text style={styles.dateLabel}>{selectedDate}</Text>
        <Pressable style={styles.dateArrow} onPress={() => shiftDate(1)}>
          <Feather name="chevron-right" size={18} color="#374151" />
        </Pressable>

        <View style={{ flex: 1 }} />

        {plan && (
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{plan.plan_status}</Text>
          </View>
        )}
        {nextStatus && (
          <Pressable style={styles.advanceBtn} onPress={advanceStatus} disabled={updatingStatus}>
            {updatingStatus ? <ActivityIndicator size="small" color={colors.white} /> : (
              <Text style={styles.advanceBtnText}>Mark {nextStatus}</Text>
            )}
          </Pressable>
        )}
      </View>

      {loading || !plan ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* Previous day variance */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Previous Day ({plan.previous_day.date})</Text>
            <View style={styles.varianceRow}>
              <Text style={styles.varianceMetric}>Planned: {plan.previous_day.planned_total}</Text>
              <Text style={styles.varianceMetric}>Completed: {plan.previous_day.completed_total}</Text>
              <Text style={[styles.varianceMetric, plan.previous_day.variance < 0 && styles.varianceNegative]}>
                Variance: {plan.previous_day.variance}
              </Text>
            </View>
            {plan.previous_day.lines.filter((l) => l.variance && l.variance < 0).map((line) => (
              <View key={line.plan_id} style={styles.varianceLine}>
                <Text style={styles.varianceLineText}>
                  {line.product_name} — {line.completed_quantity}/{line.target_quantity}
                  {line.variance_reason ? ` (${line.variance_reason})` : " — no reason recorded"}
                </Text>
              </View>
            ))}
          </View>

          {/* Demand readiness */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Demand Readiness — open orders</Text>
            {plan.demand_readiness.length === 0 ? (
              <Text style={styles.emptyText}>No open order demand right now.</Text>
            ) : (
              plan.demand_readiness.map((row) => (
                <View key={`${row.po_id}-${row.product_id}`} style={styles.readinessRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.readinessProduct}>
                      {row.product_name} {row.is_urgent ? "· URGENT" : ""}
                    </Text>
                    <Text style={styles.readinessMeta}>
                      {row.customer} · {row.remaining_quantity} remaining · due {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                    </Text>
                    {row.readiness === "RED" && (
                      <Text style={styles.blockedText}>Blocked by: {row.blocked_by.join(", ")}</Text>
                    )}
                  </View>
                  <View style={[styles.readinessBadge, { backgroundColor: row.readiness === "RED" ? "#FEE2E2" : "#DCFCE7" }]}>
                    <Text style={[styles.readinessBadgeText, { color: row.readiness === "RED" ? "#B91C1C" : "#166534" }]}>
                      {row.readiness === "RED" ? "Blocked" : "Ready"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* This date's plan, by department */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan for {selectedDate}</Text>
            <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
              <Feather name="plus" size={14} color={colors.white} style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Row</Text>
            </Pressable>
          </View>

          {Object.keys(plan.by_department).length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Nothing planned for this date yet.</Text>
            </View>
          ) : (
            Object.entries(plan.by_department).map(([deptName, lines]) => (
              <View key={deptName} style={styles.card}>
                <Text style={styles.cardTitle}>{deptName}</Text>
                {lines.map((line) => (
                  <View key={line.plan_id} style={styles.planRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planProduct}>
                        {line.product_name} {line.priority === "Urgent" ? "· URGENT" : ""}
                      </Text>
                      <Text style={styles.planMeta}>
                        {line.completed_quantity}/{line.target_quantity} · {line.status}
                        {line.variance_reason ? ` · ${line.variance_reason}` : ""}
                      </Text>
                    </View>
                    <Pressable style={styles.updateBtn} onPress={() => openCompleteModal(line)}>
                      <Feather name="edit-2" size={14} color="#374151" />
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => handleDeleteRow(line.plan_id)}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
        </>
      )}

      {/* Add Row modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModal}>
            <Text style={styles.modalTitle}>Add Plan Row — {selectedDate}</Text>
            <Text style={styles.label}>Product</Text>
            <SelectInput
              placeholder={newProduct ? newProduct.name : "Select product..."}
              options={items}
              onSelect={setNewProduct}
            />
            <Text style={styles.label}>Department</Text>
            <SelectInput
              placeholder={newDept ? newDept.name : "Select department..."}
              options={departments}
              onSelect={setNewDept}
            />
            <Text style={styles.label}>Target quantity</Text>
            <TextInput style={styles.textInput} value={newQty} onChangeText={setNewQty} keyboardType="numeric" placeholder="e.g. 5000" />
            <Pressable style={styles.urgentToggle} onPress={() => setNewUrgent(!newUrgent)}>
              <Feather name={newUrgent ? "check-square" : "square"} size={18} color="#8B5CF6" />
              <Text style={styles.urgentToggleText}>Mark urgent</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAddRow} disabled={submittingRow}>
                {submittingRow ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveBtnText}>Add</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update / mark-complete modal */}
      <Modal visible={!!completeTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.addModal}>
            <Text style={styles.modalTitle}>{completeTarget?.product_name}</Text>
            <Text style={styles.label}>Completed quantity (target {completeTarget?.target_quantity})</Text>
            <TextInput style={styles.textInput} value={completeQty} onChangeText={setCompleteQty} keyboardType="numeric" />

            {parseInt(completeQty, 10) < (completeTarget?.target_quantity || 0) && (
              <>
                <Text style={styles.label}>Reason for shortfall</Text>
                {["Material shortage", "Supplier delay", "Machine breakdown", "Manpower shortage", "Quality hold", "Packaging shortage", "Previous order pending", "Customer change", "Other"].map((reason) => (
                  <Pressable key={reason} style={styles.reasonOption} onPress={() => setCompleteReason(reason)}>
                    <Feather name={completeReason === reason ? "check-circle" : "circle"} size={16} color={completeReason === reason ? "#8B5CF6" : "#D1D5DB"} />
                    <Text style={styles.reasonOptionText}>{reason}</Text>
                  </Pressable>
                ))}
              </>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setCompleteTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={submitComplete}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  header: { marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280" },

  dateBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", padding: spacing.sm, marginBottom: spacing.lg, gap: spacing.sm },
  dateArrow: { padding: 8 },
  dateLabel: { fontSize: 15, fontWeight: "700", color: "#111111" },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  advanceBtn: { backgroundColor: "#8B5CF6", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8 },
  advanceBtnText: { color: colors.white, fontSize: 12, fontWeight: "700" },

  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: spacing.lg, marginBottom: spacing.lg },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111111", marginBottom: 10 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  varianceRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  varianceMetric: { fontSize: 13, color: "#374151", fontWeight: "600" },
  varianceNegative: { color: "#DC2626" },
  varianceLine: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  varianceLineText: { fontSize: 12, color: "#6B7280" },

  readinessRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 10 },
  readinessProduct: { fontSize: 13, fontWeight: "700", color: "#111111" },
  readinessMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  blockedText: { fontSize: 11, color: "#DC2626", marginTop: 2, fontWeight: "600" },
  readinessBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  readinessBadgeText: { fontSize: 11, fontWeight: "700" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  addBtnText: { color: colors.white, fontSize: 12, fontWeight: "700" },

  planRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 8 },
  planProduct: { fontSize: 13, fontWeight: "700", color: "#111111" },
  planMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  updateBtn: { padding: 8 },
  deleteBtn: { padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  addModal: { width: "100%", maxWidth: 420, maxHeight: "85%", backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111111", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 6, marginTop: 10 },
  textInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 14 },
  urgentToggle: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 },
  urgentToggleText: { fontSize: 13, color: "#374151" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#F3F4F6" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#8B5CF6" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },

  reasonOption: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 8 },
  reasonOptionText: { fontSize: 13, color: "#374151" },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12 },
  selectText: { fontSize: 13, color: "#374151" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  pickerModal: { width: "100%", maxWidth: 360, maxHeight: "60%", backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerOptionText: { fontSize: 14, color: "#374151" },
  pickerEmpty: { padding: 20, fontSize: 13, color: "#9CA3AF", textAlign: "center" },
});
