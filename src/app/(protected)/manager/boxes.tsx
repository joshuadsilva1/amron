import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import BoxService, { BoxMapping } from "@/services/boxService";
import { useSortable } from "@/utils/useSortable";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

interface ItemOption { id: string; name: string; item_code: string; }

// Same modal-dropdown pattern used elsewhere (Recipe Builder, OEM Mappings).
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
            {(!options || options.length === 0) ? (
              <Text style={styles.dropdownEmptyText}>No options available.</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item: any) => String(item.id)}
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
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function BoxesPage() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<BoxMapping[]>([]);
  const [boxOptions, setBoxOptions] = useState<ItemOption[]>([]);
  const [productOptions, setProductOptions] = useState<ItemOption[]>([]);

  // Add Mapping modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [pcsPerBox, setPcsPerBox] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete — custom in-app confirm, not Alert/window.confirm
  const [deleteTarget, setDeleteTarget] = useState<BoxMapping | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const search = useSearch(mappings);
  const { sorted: sortedMappings, sortKey, sortDir, toggleSort } = useSortable<BoxMapping>(search.filtered);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mappingsData, deptsRes, itemsRes] = await Promise.all([
        BoxService.getMappings(),
        api.get("/departments"),
        api.get("/items"),
      ]);

      setMappings(mappingsData);

      const departments = deptsRes.data?.data || [];
      const allItems = itemsRes.data?.data || [];

      // Boxes live in whichever department is the packaging department
      // (e.g. "Box Theli") — matched by name, not the unreliable free-text
      // category field. Products are finished goods: items currently
      // sitting in the highest-ranked (FINAL) department.
      const boxDept = departments.find((d: any) => d.name.toLowerCase().includes("box"));
      const boxItems = boxDept ? allItems.filter((i: any) => i.department_id === boxDept.id) : [];
      setBoxOptions(boxItems.map((i: any) => ({ id: i.id, name: i.name, item_code: i.item_code })));

      const finishedGoodsRes = await api.get("/items?department_level=FINAL");
      const finishedGoods = finishedGoodsRes.data?.data || [];
      setProductOptions(finishedGoods.map((i: any) => ({ id: i.id, name: i.name, item_code: i.item_code })));
    } catch (error) {
      console.error("Failed to load box mappings", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setSelectedBoxId("");
    setSelectedProductId("");
    setPcsPerBox("");
    setModalVisible(true);
  };

  const handleSaveMapping = async () => {
    const qty = parseInt(pcsPerBox, 10);
    if (!selectedBoxId || !selectedProductId) {
      Alert.alert("Missing Info", "Select both a box and a product.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Invalid value", "Pieces per box must be a positive number.");
      return;
    }
    try {
      setSubmitting(true);
      await BoxService.saveMapping(selectedBoxId, selectedProductId, qty);
      setModalVisible(false);
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save mapping.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteMapping = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await BoxService.deleteMapping(deleteTarget.id);
      setMappings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to delete mapping.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Boxes</Text>
            <Text style={styles.subtitle}>
              Map how many pieces of a product fit in one box. The same box can hold different quantities of different products.
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Feather name="plus" size={18} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.addButtonText}>Add Mapping</Text>
          </Pressable>
        </View>

        {/* Table Card / Empty State */}
        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search box mappings..."
          resultCount={search.filtered.length}
          totalCount={mappings.length}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="BOX" active={sortKey === "box_name"} direction={sortDir} onPress={() => toggleSort("box_name")} textStyle={styles.columnHeader} containerStyle={{ width: 180 }} />
              <SortableHeaderCell label="PRODUCT" active={sortKey === "product_name"} direction={sortDir} onPress={() => toggleSort("product_name")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 180 }} />
              <SortableHeaderCell label="PCS PER BOX" active={sortKey === "pcs_per_box"} direction={sortDir} onPress={() => toggleSort("pcs_per_box")} textStyle={styles.columnHeader} containerStyle={{ width: 120, justifyContent: "flex-end" }} />
              <Text style={[styles.columnHeader, { width: 60, textAlign: "right" }]}>ACTION</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
            ) : mappings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No box mappings yet. Tap "Add Mapping" to create one.</Text>
              </View>
            ) : (
              sortedMappings.map((m) => (
                <View key={m.id} style={styles.tableRow}>
                  <View style={{ width: 180 }}>
                    <Text style={styles.cellTextBold}>{m.box_name}</Text>
                    {m.box_code && <Text style={styles.cellSubtext}>{m.box_code}</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={styles.cellTextBold}>{m.product_name}</Text>
                    {m.product_code && <Text style={styles.cellSubtext}>{m.product_code}</Text>}
                  </View>
                  <Text style={[styles.cellText, { width: 120, textAlign: "right", fontWeight: "700" }]}>{m.pcs_per_box}</Text>
                  <View style={{ width: 60, alignItems: "flex-end" }}>
                    {deletingId === m.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Pressable hitSlop={8} onPress={() => setDeleteTarget(m)}>
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Footer Helper Note */}
        <View style={styles.helperRow}>
          <Feather name="box" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={styles.helperText}>
            Add box items on the Items page under the packaging department first — they'll show up here to map.
          </Text>
        </View>

      </ScrollView>

      {/* Add Mapping Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Box Mapping</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Box*</Text>
            <SelectInput placeholder="Select box..." value={selectedBoxId} options={boxOptions} onSelect={setSelectedBoxId} />
            {boxOptions.length === 0 && (
              <Text style={styles.helperTextSmall}>No box items found — add one under Items & QR first.</Text>
            )}

            <Text style={styles.inputLabel}>Product*</Text>
            <SelectInput placeholder="Select product..." value={selectedProductId} options={productOptions} onSelect={setSelectedProductId} />
            {productOptions.length === 0 && (
              <Text style={styles.helperTextSmall}>No finished goods yet — an item only shows up here once it's in the Dispatch department.</Text>
            )}

            <Text style={styles.inputLabel}>Pieces per box*</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={pcsPerBox}
              onChangeText={setPcsPerBox}
            />

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSaveMapping}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Save Mapping</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={!!deleteTarget} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrapper}>
              <Feather name="alert-triangle" size={24} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Mapping</Text>
            <Text style={styles.confirmMessage}>
              Remove {deleteTarget?.product_name} from {deleteTarget?.box_name}?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setDeleteTarget(null)} disabled={!!deletingId}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteBtn} onPress={confirmDeleteMapping} disabled={!!deletingId}>
                {deletingId ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { flexGrow: 1, padding: spacing.xl },

  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.xl, gap: spacing.lg },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  addButtonText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  // Table
  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 560, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, overflow: "hidden", minHeight: 250, marginBottom: spacing.lg },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },

  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  cellTextBold: { fontSize: 14, fontWeight: "600", color: "#111111" },
  cellSubtext: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  emptyState: { paddingVertical: 80, justifyContent: "center", alignItems: "center" },
  emptyStateText: { fontSize: 15, color: "#6B7280", textAlign: "center", paddingHorizontal: 40 },

  helperRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  helperText: { fontSize: 14, color: "#6B7280", flex: 1 },
  helperTextSmall: { fontSize: 12, color: "#9CA3AF", marginTop: -12, marginBottom: 16 },

  // Select dropdown
  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 48, marginBottom: 4 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500", flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownEmptyText: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151", flex: 1 },

  // Add Mapping Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#111111" },
  closeIcon: { padding: 4 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, fontSize: 16, color: "#111111", marginBottom: 8 },

  submitButton: { backgroundColor: "#8B5CF6", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 16 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: colors.white, fontSize: 15, fontWeight: "700" },

  // Custom delete-confirm modal (not Alert.alert / window.confirm)
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmCard: { backgroundColor: colors.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, alignItems: "center" },
  confirmIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#111111", marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#F3F4F6" },
  confirmCancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  confirmDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#EF4444" },
  confirmDeleteText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
