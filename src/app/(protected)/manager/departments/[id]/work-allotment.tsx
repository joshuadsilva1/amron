import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator, TextInput, Modal, FlatList } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import DatePickerInput from "@/components/common/DatePickerInput";
import { useSearch } from "@/utils/useSearch";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import ProductionService, { ProductionPlan } from "@/services/productionService";
import useAuthStore from "@/store/authStore";

const SelectInput = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View>
      <Pressable style={styles.selectBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? `${selectedOption.name}${selectedOption.item_code ? ` (${selectedOption.item_code})` : ""}` : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options || []}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(item.id); setModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                    {item.name}{item.item_code ? ` (${item.item_code})` : ""}
                  </Text>
                  {value === item.id && <Feather name="check" size={18} color="#8B5CF6" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#D97706" },
  In_Progress: { bg: "#DBEAFE", text: "#2563EB" },
  Completed: { bg: "#ECFDF5", text: "#10B981" },
};

export default function WorkAllotmentPage() {
  const { id } = useLocalSearchParams();
  const departmentId = String(id || "");
  const [departmentName, setDepartmentName] = useState("Loading...");

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const search = useSearch(plans);
  const [items, setItems] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState("");
  const [productionDate, setProductionDate] = useState(tomorrowISO());
  const [targetQty, setTargetQty] = useState("");
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [submitting, setSubmitting] = useState(false);
  const [sendingSchedule, setSendingSchedule] = useState(false);

  const user = useAuthStore((s) => s.user);
  const canSendSchedule = user?.role === "PRODUCTION_MANAGER" || user?.role === "ADMIN";

  const fetchData = useCallback(async () => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const deptsRes = await api.get("/departments/");
      const allDepts = deptsRes.data?.data || deptsRes.data || [];
      const currentDept = allDepts.find((d: any) => String(d.id) === departmentId);
      const name = currentDept?.name || "Unknown Department";
      setDepartmentName(name);

      const [plansData, itemsRes] = await Promise.all([
        ProductionService.getPlans(undefined, name).catch(() => []),
        api.get("/items").catch(() => ({ data: { data: [] } })),
      ]);
      setPlans(plansData);
      setItems(itemsRes.data?.data || []);
    } catch (error) {
      console.warn("Failed to load work allotment data:", error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAllot = async () => {
    if (!productId || !targetQty || parseInt(targetQty, 10) <= 0) {
      Alert.alert("Error", "Select a product and enter a target quantity greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await ProductionService.createPlan({
        production_date: productionDate,
        product_id: productId,
        department_name: departmentName,
        target_quantity: parseInt(targetQty, 10),
        priority,
      });
      Alert.alert("Success", response.message || "Work allotted.");
      setProductId("");
      setTargetQty("");
      setPriority("Normal");
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to allot work.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendSchedule = async () => {
    try {
      setSendingSchedule(true);
      const response = await ProductionService.sendSchedule(departmentName, todayISO());
      Alert.alert("Sent", response.message || "Schedule sent to the department.");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to send schedule.");
    } finally {
      setSendingSchedule(false);
    }
  };

  const getSubtitle = () => {
    const name = departmentName.toLowerCase();
    if (name.includes("moulding")) return "Moulds raw plastic/powder parts. Powder is auto-calculated from moulding weight.";
    if (name.includes("brasspart")) return "Brass components measured in gross. No weight/powder calculations.";
    return `Manage and track daily tasks and allotments for the ${departmentName} team.`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{departmentName} — Work Allotment</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          <View style={styles.headerActions}>
            {canSendSchedule && (
              <Pressable style={styles.sendScheduleBtn} onPress={handleSendSchedule} disabled={sendingSchedule}>
                {sendingSchedule ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={styles.sendScheduleBtnText}>Send Today's Schedule</Text>
                  </>
                )}
              </Pressable>
            )}
            <Pressable style={styles.addBtn} onPress={() => setShowForm((v) => !v)}>
              <Feather name={showForm ? "x" : "plus"} size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.addBtnText}>{showForm ? "Cancel" : "Allot work"}</Text>
            </Pressable>
          </View>
        </View>

        {showForm && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>New allotment</Text>

            <Text style={styles.label}>Product</Text>
            <SelectInput placeholder="Select product..." value={productId} options={items} onSelect={setProductId} />

            <View style={styles.dateRow}>
              <Pressable style={[styles.dateChip, productionDate === todayISO() && styles.dateChipSelected]} onPress={() => setProductionDate(todayISO())}>
                <Text style={[styles.dateChipText, productionDate === todayISO() && styles.dateChipTextSelected]}>Today</Text>
              </Pressable>
              <Pressable style={[styles.dateChip, productionDate === tomorrowISO() && styles.dateChipSelected]} onPress={() => setProductionDate(tomorrowISO())}>
                <Text style={[styles.dateChipText, productionDate === tomorrowISO() && styles.dateChipTextSelected]}>Tomorrow</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <DatePickerInput value={productionDate} onChange={setProductionDate} placeholder="Or pick a date..." />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Target quantity</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={targetQty}
                  onChangeText={setTargetQty}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityRow}>
                  <Pressable style={[styles.priorityBtn, priority === "Normal" && styles.priorityBtnSelected]} onPress={() => setPriority("Normal")}>
                    <Text style={[styles.priorityBtnText, priority === "Normal" && { color: colors.white }]}>Normal</Text>
                  </Pressable>
                  <Pressable style={[styles.priorityBtn, priority === "Urgent" && styles.priorityBtnUrgent]} onPress={() => setPriority("Urgent")}>
                    <Text style={[styles.priorityBtnText, priority === "Urgent" && { color: colors.white }]}>Urgent</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleAllot} disabled={submitting}>
              <Text style={styles.submitBtnText}>{submitting ? "Allotting..." : "Allot work"}</Text>
            </Pressable>
          </View>
        )}

        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search allotments by product or status..."
          resultCount={search.filtered.length}
          totalCount={plans.length}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No work allotted yet. Tap "Allot work" to plan tomorrow's production.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {search.filtered.map((plan) => {
              const statusStyle = STATUS_COLORS[plan.status] || STATUS_COLORS.Pending;
              return (
                <View key={plan.plan_id} style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>
                      {plan.product_name}
                      {plan.priority === "Urgent" && <Text style={styles.urgentTag}>  URGENT</Text>}
                    </Text>
                    <Text style={styles.planMeta}>
                      {plan.internal_code || "N/A"} · {plan.production_date} · {plan.completed_quantity}/{plan.target_quantity} done
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{plan.status.replace("_", " ")}</Text>
                  </View>
                </View>
              );
            })}
          </View>
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
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
  sendScheduleBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#EDE9FE", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#DDD6FE" },
  sendScheduleBtnText: { fontSize: 14, fontWeight: "600", color: "#8B5CF6" },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 4 },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 12 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500" },

  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 320, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  dateRow: { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" },
  dateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  dateChipSelected: { backgroundColor: "#111111", borderColor: "#111111" },
  dateChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  dateChipTextSelected: { color: colors.white },
  dateInput: { flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, height: 40, paddingHorizontal: 12, fontSize: 14, color: "#111111" },

  formRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  qtyInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 15, color: "#111111" },

  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: 44, borderRadius: 10, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  priorityBtnSelected: { backgroundColor: "#111111", borderColor: "#111111" },
  priorityBtnUrgent: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  priorityBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  submitBtn: { backgroundColor: "#8B5CF6", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  submitBtnDisabled: { backgroundColor: "#D1D5DB" },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },

  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  planName: { fontSize: 14, fontWeight: "700", color: "#111111" },
  planMeta: { fontSize: 12, color: "#6B7280", marginTop: 3 },
  urgentTag: { fontSize: 11, fontWeight: "800", color: "#EF4444" },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 100, justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
