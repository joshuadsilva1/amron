import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, ActivityIndicator, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import useAuthStore from "@/store/authStore";
import RecipeService, { RecipeSummary } from "@/services/recipeService";
import ProductionService, { DepartmentStockRow } from "@/services/productionService";
import TransactionService, { DepartmentTransaction } from "@/services/transactionService";

// Same modal-dropdown pattern used elsewhere (racks.tsx, handoff.tsx, recipes/new.tsx).
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
                    {item.name}
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

export default function LogProductionPage() {
  const { id } = useLocalSearchParams();
  const departmentId = String(id || "");
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState("Loading...");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [deptStock, setDeptStock] = useState<DepartmentStockRow[]>([]);
  const [history, setHistory] = useState<DepartmentTransaction[]>([]);

  const [selectedFGId, setSelectedFGId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const selectedRecipe = recipes.find((r) => r.finished_good_id === selectedFGId) || null;
  const qtyNum = parseFloat(quantity) || 0;

  const stockFor = (itemId: string) => deptStock.find((s) => s.item_id === itemId)?.quantity_on_shelf ?? 0;

  const fetchData = useCallback(async () => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const [deptsRes, recipesData, stockData, historyData] = await Promise.all([
        api.get("/departments/"),
        RecipeService.getRecipes().catch(() => []),
        ProductionService.getDepartmentStock(departmentId).catch(() => []),
        TransactionService.getDepartmentHistory(departmentId).catch(() => []),
      ]);

      const allDepts = deptsRes.data?.data || deptsRes.data || [];
      const currentDept = allDepts.find((d: any) => String(d.id) === departmentId);
      setDepartmentName(currentDept?.name || "Unknown Department");

      setRecipes(recipesData);
      setDeptStock(stockData);
      setHistory(historyData.filter((h) => h.reason === "Production"));
    } catch (error) {
      console.warn("Failed to load production data:", error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProduce = async () => {
    if (!selectedRecipe) {
      Alert.alert("Error", "Select a finished good to manufacture.");
      return;
    }
    if (qtyNum <= 0) {
      Alert.alert("Error", "Enter a quantity greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await ProductionService.logProduction({
        department_id: departmentId,
        item_id: selectedRecipe.finished_good_id,
        quantity: qtyNum,
        user_name: user?.name || "Unknown",
      });

      Alert.alert("Success", response.message || "Production logged.");
      setQuantity("1");
      fetchData();
    } catch (error: any) {
      Alert.alert("Cannot Produce", error?.response?.data?.error || "Failed to log production.");
    } finally {
      setSubmitting(false);
    }
  };

  const finishedGoodOptions = recipes.map((r) => ({ id: r.finished_good_id, name: r.finished_good_name }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{departmentName} — Log Production</Text>
            <Text style={styles.subtitle}>
              Record units manufactured here — recipe components are checked and deducted from this department's stock automatically.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : recipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No finished goods have a recipe yet. Build one in Recipes (BOM) first.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Finished good</Text>
              <SelectInput
                placeholder="Select finished good..."
                value={selectedFGId}
                options={finishedGoodOptions}
                onSelect={setSelectedFGId}
              />

              {selectedRecipe && (
                <>
                  <View style={styles.qtyRow}>
                    <Text style={styles.label}>Quantity to produce</Text>
                    <TextInput
                      style={styles.qtyInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="number-pad"
                    />
                  </View>

                  <Text style={styles.sectionTitle}>Will consume</Text>
                  {selectedRecipe.components.map((c) => {
                    const needed = c.quantity_required * qtyNum;
                    const available = stockFor(c.component_id);
                    const insufficient = needed > available;
                    return (
                      <View key={c.id} style={styles.consumeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.consumeName}>{c.component_name || "Unknown component"}</Text>
                          <Text style={styles.consumeMeta}>{c.component_code || "N/A"}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.consumeQty, insufficient && { color: "#EF4444" }]}>
                            {needed} needed
                          </Text>
                          <Text style={styles.consumeAvailable}>{available} in stock</Text>
                        </View>
                      </View>
                    );
                  })}

                  <Pressable
                    style={[styles.produceBtn, (submitting || qtyNum <= 0) && styles.produceBtnDisabled]}
                    onPress={handleProduce}
                    disabled={submitting || qtyNum <= 0}
                  >
                    <Feather name="cpu" size={16} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.produceBtnText}>{submitting ? "Producing..." : `Produce ${quantity || 0} unit(s)`}</Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recent production in {departmentName}</Text>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No production logged yet.</Text>
              ) : (
                history.map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyName}>{h.item_name}</Text>
                      <Text style={styles.historyMeta}>{h.date}</Text>
                    </View>
                    <Text style={styles.historyQty}>+{h.quantity}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },

  headerRow: { marginBottom: spacing.lg },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500" },

  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 320, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", color: "#111111" },
  qtyInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, width: 100, height: 44, paddingHorizontal: 12, fontSize: 15, textAlign: "center" },

  consumeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  consumeName: { fontSize: 14, fontWeight: "600", color: "#111111" },
  consumeMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  consumeQty: { fontSize: 14, fontWeight: "700", color: "#111111" },
  consumeAvailable: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  produceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#111111", paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  produceBtnDisabled: { backgroundColor: "#9CA3AF" },
  produceBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },

  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  historyName: { fontSize: 14, fontWeight: "600", color: "#111111" },
  historyMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  historyQty: { fontSize: 15, fontWeight: "800", color: "#10B981" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 40, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
