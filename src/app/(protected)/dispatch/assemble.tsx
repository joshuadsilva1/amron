import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import api from "@/services/api";
import RecipeService, { RecipeComponent } from "@/services/recipeService";
import TransactionService from "@/services/transactionService";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

// Same modal-dropdown pattern used across the app (recipes/new.tsx, quality/index.tsx, ...).
const SelectInput = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);
  return (
    <View>
      <Pressable style={styles.selectBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <FlatList
              data={options || []}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.dropdownOption} onPress={() => { onSelect(item.id); setModalVisible(false); }}>
                  <Text style={styles.dropdownOptionText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function AssembleFinishedGoodScreen() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [components, setComponents] = useState<RecipeComponent[]>([]);
  const [breakages, setBreakages] = useState<Record<string, string>>({});
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof TransactionService.assembleFinishedGood>> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [deptsRes, itemsRes] = await Promise.all([api.get("/departments"), api.get("/items")]);
        setDepartments(deptsRes.data?.data || []);
        setItems(itemsRes.data?.data || []);
      } catch (e) {
        console.warn("Failed to load departments/items", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!itemId) {
      setComponents([]);
      return;
    }
    (async () => {
      try {
        setLoadingRecipe(true);
        const { components: comps } = await RecipeService.getRecipe(itemId);
        setComponents(comps);
        setBreakages({});
      } catch (e) {
        console.warn("Failed to load recipe", e);
        setComponents([]);
      } finally {
        setLoadingRecipe(false);
      }
    })();
  }, [itemId]);

  const handleAssemble = async () => {
    if (!departmentId || !itemId || !plannedQuantity) {
      Alert.alert("Missing data", "Select a department, a finished good, and a planned quantity.");
      return;
    }
    if (components.length === 0) {
      Alert.alert("No recipe", "This item has no active recipe — nothing to assemble.");
      return;
    }
    const qty = parseFloat(plannedQuantity);
    if (!qty || qty <= 0) {
      Alert.alert("Invalid quantity", "Planned quantity must be greater than zero.");
      return;
    }

    const breakagePayload: Record<string, number> = {};
    for (const [compId, val] of Object.entries(breakages)) {
      const n = parseFloat(val);
      if (n > 0) breakagePayload[compId] = n;
    }

    try {
      setSubmitting(true);
      setResult(null);
      const res = await TransactionService.assembleFinishedGood({
        department_id: departmentId,
        item_id: itemId,
        planned_quantity: qty,
        breakages: breakagePayload,
      });
      setResult(res);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to assemble.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Assemble Finished Good</Text>
      <Text style={styles.subtitle}>
        Combine moulding and brass components into an FG. Report any breakage per component — actual output is
        automatically capped by whichever component ran out first, and unused stock on the others is restocked.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Department (Dispatch/Assembly)</Text>
        <SelectInput placeholder="Select department..." value={departmentId} options={departments} onSelect={setDepartmentId} />

        <Text style={styles.label}>Finished good</Text>
        <SelectInput
          placeholder="Select finished good..."
          value={itemId}
          options={items.map((i: any) => ({ id: i.id, name: `${i.name} (${i.item_code})` }))}
          onSelect={setItemId}
        />

        <Text style={styles.label}>Planned quantity</Text>
        <TextInput
          style={styles.input}
          value={plannedQuantity}
          onChangeText={setPlannedQuantity}
          keyboardType="numeric"
          placeholder="e.g. 1000"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {loadingRecipe && <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 20 }} />}

      {!loadingRecipe && components.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Components — report any breakage</Text>
          {components.map((c) => (
            <View key={c.id} style={styles.componentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.componentName}>{c.component_name}</Text>
                <Text style={styles.componentMeta}>{c.quantity_required} per unit · {c.component_department_name || "-"}</Text>
              </View>
              <TextInput
                style={styles.breakageInput}
                value={breakages[c.component_id] || ""}
                onChangeText={(v) => setBreakages((prev) => ({ ...prev, [c.component_id]: v }))}
                keyboardType="numeric"
                placeholder="0 broken"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.submitBtn, (submitting || !itemId) && styles.submitBtnDisabled]}
        onPress={handleAssemble}
        disabled={submitting || !itemId}
      >
        <Feather name="check-circle" size={18} color={colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.submitBtnText}>{submitting ? "Assembling..." : "Assemble"}</Text>
      </Pressable>

      {result && (
        <View style={[styles.card, styles.resultCard]}>
          <Text style={styles.resultTitle}>{result.message}</Text>
          <Text style={styles.resultOutput}>
            Output: {result.actual_output} of {result.planned_quantity} planned
          </Text>
          {result.components.map((c) => (
            <View key={c.component_id} style={styles.resultRow}>
              <Text style={styles.resultComponentName}>{c.component_name}</Text>
              <Text style={styles.resultDetail}>
                pulled {c.pulled_qty} · consumed {c.consumed_qty}
                {c.broken_qty > 0 ? ` · broken ${c.broken_qty}` : ""}
                {c.restocked_qty > 0 ? ` · restocked ${c.restocked_qty}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: spacing.lg },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15, color: "#111111" },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44 },
  selectText: { fontSize: 15, color: "#111111", flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, maxHeight: "60%", backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  dropdownOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 12 },
  componentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  componentName: { fontSize: 14, fontWeight: "600", color: "#111111" },
  componentMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  breakageInput: { width: 100, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 8, paddingHorizontal: 10, height: 40, fontSize: 14, color: "#991B1B", textAlign: "center" },

  submitBtn: { flexDirection: "row", backgroundColor: "#111111", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  submitBtnDisabled: { backgroundColor: "#9CA3AF" },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },

  resultCard: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  resultTitle: { fontSize: 15, fontWeight: "700", color: "#065F46", marginBottom: 4 },
  resultOutput: { fontSize: 13, color: "#065F46", marginBottom: 12 },
  resultRow: { paddingVertical: 6 },
  resultComponentName: { fontSize: 13, fontWeight: "600", color: "#111111" },
  resultDetail: { fontSize: 12, color: "#6B7280" },
});
