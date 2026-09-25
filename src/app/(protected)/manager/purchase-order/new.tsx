import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch, Modal, FlatList, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import OrderService from "@/services/orderService";
import ClientService, { Client } from "@/services/clientService";
import OEMService, { OEMMapping } from "@/services/oemService";
import ItemService, { MasterItem } from "@/services/itemService";
import RecipeService from "@/services/recipeService";
import DatePickerInput from "@/components/common/DatePickerInput";
import SearchBar from "@/components/common/SearchBar";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";
import Pagination from "@/components/common/Pagination";
import { useSearch } from "@/utils/useSearch";
import { useSortable } from "@/utils/useSortable";
import { usePagination } from "@/utils/usePagination";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

const SelectInput = ({ placeholder, value, options, onSelect, renderLabel }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View>
      <Pressable style={styles.selectBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? (renderLabel ? renderLabel(selectedOption) : selectedOption.name) : placeholder}
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
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.dropdownOption}
                    onPress={() => { onSelect(item.id); setModalVisible(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                      {renderLabel ? renderLabel(item) : item.name}
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

// One finished good as the picker/line table shows it: our item plus
// this client's code for it (from an earlier order, else the code typed
// on the item under Items & QR).
interface ProductRow {
  product_id: string;
  client_code: string;
  item_code: string;
  name: string;
  description: string;
  unit: string;
  has_recipe: boolean;
  // True once this client has ordered it before (code is remembered).
  known_to_client: boolean;
}

interface Line extends ProductRow {
  quantity: string;
}

// Table-in-a-modal for choosing which finished goods the client ordered.
// Tick as many as needed, then "Add".
const ProductPicker = ({ visible, rows, alreadyAdded, onClose, onAdd }: {
  visible: boolean;
  rows: ProductRow[];
  alreadyAdded: Set<string>;
  onClose: () => void;
  onAdd: (rows: ProductRow[]) => void;
}) => {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const search = useSearch(rows);
  const { sorted, sortKey, sortDir, toggleSort } = useSortable<ProductRow>(search.filtered);
  const pagination = usePagination(sorted, 10);

  useEffect(() => {
    if (visible) {
      setPicked(new Set());
      search.setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const header = (label: string, key: keyof ProductRow, width: any) => (
    <SortableHeaderCell label={label} active={sortKey === key} direction={sortDir} onPress={() => toggleSort(key)} textStyle={styles.columnHeader} containerStyle={width} />
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dropdownOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select products ordered</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <SearchBar
              value={search.query}
              onChangeText={search.setQuery}
              placeholder="Search by client code, our code, name..."
              resultCount={search.filtered.length}
              totalCount={rows.length}
              style={{ maxWidth: undefined, marginBottom: 8 }}
            />
          </View>

          <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 820, flex: 1 }}>
              <View style={styles.tableHeader}>
                <View style={{ width: 32 }} />
                {header("CLIENT CODE", "client_code", { width: 130 })}
                {header("OUR CODE", "item_code", { width: 110 })}
                {header("PRODUCT", "name", { flex: 1, minWidth: 180 })}
                {header("DESCRIPTION", "description", { width: 200 })}
                {header("UNIT", "unit", { width: 70 })}
                <Text style={[styles.columnHeader, { width: 90 }]}>RECIPE</Text>
              </View>
              <ScrollView style={{ maxHeight: 380 }}>
                {pagination.pageRows.length === 0 ? (
                  <Text style={styles.dropdownEmptyText}>
                    {rows.length === 0 ? "No finished goods yet — add them under Items & QR in a top-level department (e.g. Dispatch)." : "No matches."}
                  </Text>
                ) : pagination.pageRows.map((row) => {
                  const added = alreadyAdded.has(row.product_id);
                  const checked = picked.has(row.product_id);
                  return (
                    <Pressable
                      key={row.product_id}
                      style={[styles.tableRow, checked && { backgroundColor: "#F5F3FF" }, added && { opacity: 0.45 }]}
                      onPress={() => !added && toggle(row.product_id)}
                      disabled={added}
                    >
                      <View style={{ width: 32 }}>
                        <Feather name={added || checked ? "check-square" : "square"} size={18} color={checked ? "#8B5CF6" : "#9CA3AF"} />
                      </View>
                      <Text style={[styles.cellTextBold, { width: 130 }]} numberOfLines={1}>{row.client_code || "—"}</Text>
                      <Text style={[styles.cellText, { width: 110 }]} numberOfLines={1}>{row.item_code}</Text>
                      <Text style={[styles.cellText, { flex: 1, minWidth: 180 }]} numberOfLines={2}>{row.name}</Text>
                      <Text style={[styles.cellSubtext, { width: 200 }]} numberOfLines={2}>{row.description || "—"}</Text>
                      <Text style={[styles.cellText, { width: 70 }]}>{row.unit}</Text>
                      <View style={{ width: 90 }}>
                        <Text style={[styles.recipeTag, !row.has_recipe && styles.recipeTagMissing]}>
                          {row.has_recipe ? "Ready" : "No recipe"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 16 }}>
            <Pagination {...pagination} />
          </View>

          <View style={styles.pickerFooter}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, picked.size === 0 && styles.submitBtnDisabled]}
              disabled={picked.size === 0}
              onPress={() => onAdd(rows.filter((r) => picked.has(r.product_id)))}
            >
              <Text style={styles.primaryBtnText}>Add {picked.size || ""} product{picked.size === 1 ? "" : "s"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function NewPOScreen() {
  const [loadingData, setLoadingData] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<OEMMapping[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<MasterItem[]>([]);
  const [recipeIds, setRecipeIds] = useState<Set<string>>(new Set());

  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [clientsData, mappingsData, itemsData, recipesData] = await Promise.all([
          ClientService.getClients(),
          OEMService.getMappings(),
          ItemService.getItems(),
          RecipeService.getRecipes().catch(() => []),
        ]);
        setClients(clientsData);
        setMappings(mappingsData);
        setFinishedGoods(itemsData.filter((i) => i.is_finished_good));
        setRecipeIds(new Set(recipesData.map((r) => r.finished_good_id)));
      } catch (error) {
        console.warn("Failed to load clients/products", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const productRows: ProductRow[] = useMemo(() => {
    if (!clientId) return [];
    const codeByProduct = new Map(
      mappings.filter((m) => m.client_id === clientId).map((m) => [m.internal_product_id, m.party_code])
    );
    return finishedGoods.map((fg) => ({
      product_id: fg.id,
      client_code: codeByProduct.get(fg.id) || fg.oem_company_code || "",
      item_code: fg.item_code,
      name: fg.name,
      description: fg.description || "",
      unit: fg.unit_of_measure || "pcs",
      has_recipe: recipeIds.has(fg.id),
      known_to_client: codeByProduct.has(fg.id),
    }));
  }, [clientId, mappings, finishedGoods, recipeIds]);

  const addLines = (rows: ProductRow[]) => {
    setLines((prev) => [...prev, ...rows.map((r) => ({ ...r, quantity: "" }))]);
    setPickerOpen(false);
  };

  const updateLine = (productId: string, field: "quantity" | "client_code", value: string) => {
    setLines((prev) => prev.map((l) => (l.product_id === productId ? { ...l, [field]: value } : l)));
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  };

  const missingRecipe = lines.filter((l) => !l.has_recipe);

  const handleSubmit = async () => {
    if (!clientId) {
      Alert.alert("Error", "Please select a client.");
      return;
    }
    if (lines.length === 0) {
      Alert.alert("Error", "Add at least one product.");
      return;
    }
    const noQty = lines.find((l) => !(parseInt(l.quantity, 10) > 0));
    if (noQty) {
      Alert.alert("Error", `Enter a quantity for ${noQty.item_code} — ${noQty.name}.`);
      return;
    }

    try {
      setSubmitting(true);
      const result = await OrderService.createPO({
        client_id: clientId,
        notes,
        is_urgent: isUrgent ? 1 : 0,
        due_date: dueDate.trim() || undefined,
        challan_number: challanNumber.trim() || undefined,
        items: lines.map((l) => ({
          product_id: l.product_id,
          client_product_code: l.client_code.trim() || undefined,
          quantity: parseInt(l.quantity, 10),
        })),
        send_to_departments: sendNow,
      });

      const send = result.send_result;
      if (!send) {
        Alert.alert("Order saved", "Send it to departments from Control Tower when ready.");
      } else if (send.ok) {
        Alert.alert("Order saved and sent", send.message);
      } else {
        Alert.alert(
          "Order saved — not sent yet",
          `${send.message}\n\nThe order is saved. Once the recipe is saved you'll be offered to send it right away.`
        );
      }
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to create PO.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Purchase Order</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Client</Text>
        <SelectInput
          placeholder="Select client..."
          value={clientId}
          options={clients.map((c) => ({ id: c.id, name: c.name }))}
          onSelect={(val: string) => {
            setClientId(val);
            setLines([]);
          }}
        />
        {clients.length === 0 && (
          <Text style={styles.helperText}>No clients yet — add one under Clients first.</Text>
        )}

        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Due date (optional)</Text>
            <DatePickerInput value={dueDate} onChange={setDueDate} placeholder="Select due date..." />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Chalan number (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={challanNumber}
              onChangeText={setChallanNumber}
              placeholder="e.g. CH-2026-001"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions..."
          placeholderTextColor="#9CA3AF"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Mark as urgent</Text>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: "#E5E7EB", true: "#EF4444" }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.itemsHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Products ordered</Text>
            <Text style={styles.helperTextTight}>The finished goods this client wants, and how many of each.</Text>
          </View>
          <Pressable
            style={[styles.primaryBtn, !clientId && styles.submitBtnDisabled]}
            onPress={() => setPickerOpen(true)}
            disabled={!clientId}
          >
            <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Add products</Text>
          </Pressable>
        </View>

        {!clientId ? (
          <Text style={styles.helperText}>Select a client first.</Text>
        ) : lines.length === 0 ? (
          <Pressable style={styles.emptyLines} onPress={() => setPickerOpen(true)}>
            <Feather name="package" size={22} color="#9CA3AF" />
            <Text style={styles.helperText}>No products yet — tap "Add products" to pick from your finished goods.</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 760, flex: 1 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { width: 140 }]}>CLIENT CODE</Text>
                <Text style={[styles.columnHeader, { width: 100 }]}>OUR CODE</Text>
                <Text style={[styles.columnHeader, { flex: 1, minWidth: 180 }]}>PRODUCT</Text>
                <Text style={[styles.columnHeader, { width: 170 }]}>QUANTITY</Text>
                <Text style={[styles.columnHeader, { width: 90 }]}>RECIPE</Text>
                <View style={{ width: 36 }} />
              </View>
              {lines.map((line) => (
                <View key={line.product_id} style={styles.tableRow}>
                  <View style={{ width: 140, paddingRight: 8 }}>
                    <TextInput
                      style={styles.cellInput}
                      value={line.client_code}
                      onChangeText={(t) => updateLine(line.product_id, "client_code", t)}
                      placeholder="Their code"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{line.item_code}</Text>
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={styles.cellTextBold} numberOfLines={1}>{line.name}</Text>
                    {!!line.description && <Text style={styles.cellSubtext} numberOfLines={1}>{line.description}</Text>}
                  </View>
                  <View style={{ width: 170, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      style={[styles.cellInput, { width: 100, textAlign: "right" }]}
                      value={line.quantity}
                      onChangeText={(t) => updateLine(line.product_id, "quantity", t.replace(/\D/g, ""))}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                    <Text style={styles.unitText}>{line.unit}</Text>
                  </View>
                  <View style={{ width: 90 }}>
                    <Text style={[styles.recipeTag, !line.has_recipe && styles.recipeTagMissing]}>
                      {line.has_recipe ? "Ready" : "No recipe"}
                    </Text>
                  </View>
                  <Pressable style={{ width: 36, alignItems: "center" }} onPress={() => removeLine(line.product_id)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {missingRecipe.length > 0 && (
          <View style={styles.warnBox}>
            <Feather name="alert-triangle" size={14} color="#92400E" />
            <Text style={styles.warnText}>
              {missingRecipe.map((l) => l.item_code).join(", ")} {missingRecipe.length === 1 ? "has" : "have"} no recipe yet, so {missingRecipe.length === 1 ? "it" : "they"} can't be sent to departments. You can still save the order — after you save the recipe, the app will offer to send it.
            </Text>
          </View>
        )}

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { marginBottom: 2 }]}>Send to departments when saved</Text>
            <Text style={styles.helperTextTight}>Raises the internal POs (Moulding, Brasspart, ...) straight away — no trip to Control Tower.</Text>
          </View>
          <Switch
            value={sendNow}
            onValueChange={setSendNow}
            trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }}
          />
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? "Saving..." : sendNow ? "Save order & send to departments" : "Save order"}
          </Text>
        </Pressable>
      </View>

      <ProductPicker
        visible={pickerOpen}
        rows={productRows}
        alreadyAdded={new Set(lines.map((l) => l.product_id))}
        onClose={() => setPickerOpen(false)}
        onAdd={addLines}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.lg },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: spacing.lg },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, marginTop: 4 },
  helperText: { fontSize: 13, color: "#9CA3AF", marginTop: 4, marginBottom: 12, textAlign: "center" },
  helperTextTight: { fontSize: 12, color: "#9CA3AF" },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48, marginBottom: 4 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500", flex: 1 },

  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownEmptyText: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151", flex: 1 },

  pickerModal: { width: "100%", maxWidth: 960, maxHeight: "92%", backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  pickerTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  pickerFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },

  tableHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 13, color: "#374151" },
  cellTextBold: { fontSize: 13, fontWeight: "700", color: "#111111" },
  cellSubtext: { fontSize: 12, color: "#6B7280" },
  cellInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, height: 38, paddingHorizontal: 10, fontSize: 14, color: "#111111" },
  unitText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },

  recipeTag: { alignSelf: "flex-start", fontSize: 11, fontWeight: "700", color: "#166534", backgroundColor: "#DCFCE7", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, overflow: "hidden" },
  recipeTagMissing: { color: "#92400E", backgroundColor: "#FEF3C7" },

  warnBox: { flexDirection: "row", gap: 8, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 10, padding: 12, marginTop: 16 },
  warnText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },

  emptyLines: { alignItems: "center", paddingVertical: 28, borderWidth: 1, borderStyle: "dashed", borderColor: "#E5E7EB", borderRadius: 12, backgroundColor: "#F9FAFB" },

  textInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48, fontSize: 15, color: "#111111", marginBottom: 4 },

  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 },
  formRow: { flexDirection: "row", gap: 12 },

  itemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },

  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  secondaryBtnText: { color: "#374151", fontSize: 14, fontWeight: "600" },

  submitBtn: { backgroundColor: "#8B5CF6", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 20 },
  submitBtnDisabled: { backgroundColor: "#D1D5DB" },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
