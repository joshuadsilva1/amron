import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Modal, Image, KeyboardAvoidingView, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import { useSortable } from "@/utils/useSortable";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";
import Pagination from "@/components/common/Pagination";
import { usePagination } from "@/utils/usePagination";
import ItemService, { UnitOfMeasure } from "@/services/itemService";

const SelectInput = ({ label, placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <Pressable style={styles.selectInputBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.inputText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options}
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

// Unit dropdown backed by the Units list (Items -> Units), with an inline
// "add a unit" row so a new unit never needs a code change.
const UnitSelect = ({ label, value, units, onSelect, onUnitsChanged }: {
  label: string;
  value: string;
  units: UnitOfMeasure[];
  onSelect: (name: string) => void;
  onUnitsChanged: () => Promise<void>;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const addUnit = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      setSaving(true);
      await ItemService.createUnit(name, newDescription.trim() || undefined);
      await onUnitsChanged();
      onSelect(name);
      setNewName("");
      setNewDescription("");
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to add unit.");
    } finally {
      setSaving(false);
    }
  };

  const removeUnit = async (unit: UnitOfMeasure) => {
    try {
      await ItemService.deleteUnit(unit.id);
      await onUnitsChanged();
    } catch (error: any) {
      Alert.alert("Can't remove unit", error.response?.data?.error || "Failed to remove unit.");
    }
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.selectInputBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.inputText, !value && { color: "#9CA3AF" }]} numberOfLines={1}>{value || "Select unit"}</Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.dropdownModal, { maxWidth: 380, maxHeight: "80%" }]} onPress={() => {}}>
            <Text style={styles.dropdownTitle}>Unit of measure</Text>
            <FlatList
              data={units}
              keyExtractor={(u) => String(u.id)}
              renderItem={({ item: unit }) => (
                <Pressable
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(unit.name); setModalVisible(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownOptionText, value === unit.name && { color: "#8B5CF6", fontWeight: "700" }]}>{unit.name}</Text>
                    {!!unit.description && <Text style={styles.helperTextSmall}>{unit.description}</Text>}
                  </View>
                  {value === unit.name ? (
                    <Feather name="check" size={18} color="#8B5CF6" />
                  ) : (
                    <Pressable onPress={() => removeUnit(unit)} hitSlop={8}>
                      <Feather name="trash-2" size={15} color="#D1D5DB" />
                    </Pressable>
                  )}
                </Pressable>
              )}
            />
            <View style={styles.addUnitBox}>
              <Text style={[styles.inputLabel, { fontSize: 13 }]}>Add a unit</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput style={[styles.textInput, { flex: 1, height: 40 }]} value={newName} onChangeText={setNewName} placeholder="e.g. rolls" placeholderTextColor="#9CA3AF" />
                <TextInput style={[styles.textInput, { flex: 2, height: 40 }]} value={newDescription} onChangeText={setNewDescription} placeholder="Description (optional)" placeholderTextColor="#9CA3AF" />
                <Pressable style={[styles.saveBtn, { paddingVertical: 10, paddingHorizontal: 14 }]} onPress={addUnit} disabled={saving || !newName.trim()}>
                  <Feather name="plus" size={16} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function ItemsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [finalRank, setFinalRank] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("All");

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isQRModalVisible, setQRModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    item_code: "",
    oem_company_code: "",
    department_id: "",
    unit_of_measure: "pcs",
    name: "",
    description: "",
    category: "",
    subcategory: "",
    pcs_per_scan: "1",
    price: "",
    box_qty: "",
    carton_qty: "",
    // Only meaningful for moulded parts — drives the White->Colour
    // routing block on recipes. "" means "not colour-tracked".
    powder_colour: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, deptsRes, levelsRes, unitsData] = await Promise.all([
        api.get('/items'),
        api.get('/departments'),
        api.get('/departments/levels').catch(() => null),
        ItemService.getUnits().catch(() => []),
      ]);
      setItems(itemsRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
      setUnits(unitsData);
      const finalLevel = (levelsRes?.data?.data || []).find((l: any) => l.is_final);
      setFinalRank(finalLevel ? finalLevel.rank : null);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    setUnits(await ItemService.getUnits().catch(() => units));
  };

  // Finished good = item in a top-level department (e.g. Dispatch). Only
  // those are sold, so only those carry a price / client product code.
  const isFinishedGoodDept = (deptId: string) =>
    finalRank !== null && departments.find((d) => String(d.id) === String(deptId))?.level === finalRank;

  const getDepartmentName = (id: string) => {
    return departments.find(d => String(d.id) === String(id))?.name || "-";
  };

  const filteredItems = items.filter(item =>
    activeTab === "All" ? true : getDepartmentName(item.department_id) === activeTab
  );
  const search = useSearch(filteredItems, (i: any) => `${Object.values(i).join(" ")} ${getDepartmentName(i.department_id)}`);
  const { sorted: sortedItems, sortKey, sortDir, toggleSort } = useSortable<any>(search.filtered);
  const pagination = usePagination(sortedItems);

  const openEditModal = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setForm({
        item_code: item.item_code || "",
        oem_company_code: item.oem_company_code || "",
        department_id: item.department_id || "",
        unit_of_measure: item.unit_of_measure || "pcs",
        name: item.name || "",
        description: item.description || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        pcs_per_scan: String(item.pcs_per_scan || "1"),
        price: String(item.price || ""),
        box_qty: String(item.box_qty || ""),
        carton_qty: String(item.carton_qty || ""),
        powder_colour: item.powder_colour || ""
      });
    } else {
      setSelectedItem(null);
      setForm({
        item_code: "", oem_company_code: "", department_id: "", unit_of_measure: "pcs",
        name: "", description: "", category: "", subcategory: "", pcs_per_scan: "1", price: "", box_qty: "", carton_qty: "",
        powder_colour: ""
      });
    }
    setEditModalVisible(true);
  };

  const openQRModal = (item: any) => {
    setSelectedItem(item);
    setQRModalVisible(true);
  };

  const handleSaveItem = async (confirmCodeChange = false) => {
    if (!form.name || !form.department_id || !form.item_code) {
      Alert.alert("Missing Fields", "Code, Department, and Name are required.");
      return;
    }

    // The printed QR label encodes the item code — changing it strands
    // every label already stuck on a package.
    if (selectedItem?.id && form.item_code !== selectedItem.item_code && !confirmCodeChange) {
      Alert.alert(
        "Change item code?",
        `Printed QR labels for this item encode "${selectedItem.item_code}". After changing it to "${form.item_code}", those labels will stop scanning and must be reprinted.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Change code", style: "destructive", onPress: () => handleSaveItem(true) },
        ]
      );
      return;
    }

    const finishedGood = isFinishedGoodDept(form.department_id);
    try {
      setIsSaving(true);
      const payload = {
        ...form,
        // Only finished goods are sold — anything else carries no price
        // or client code.
        price: finishedGood ? parseFloat(form.price) || 0.0 : 0.0,
        oem_company_code: finishedGood ? form.oem_company_code : "",
        pcs_per_scan: parseInt(form.pcs_per_scan) || 1,
        box_qty: parseInt(form.box_qty) || 0,
        carton_qty: parseInt(form.carton_qty) || 0,
        confirm_code_change: confirmCodeChange,
      };

      if (selectedItem?.id) {
        await api.put(`/items/${selectedItem.id}`, payload);
        Alert.alert("Success", "Item updated successfully.");
      } else {
        await api.post("/items", payload);
        Alert.alert("Success", "Item created successfully.");
      }
      setEditModalVisible(false);
      fetchData(); // Will now pull department_id properly!
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Items & QR</Text>
            <Text style={styles.subtitle}>
              Your master list of finished goods and raw materials. OEM mapping happens in the Client portal.
            </Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => openEditModal()}>
            <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Add item</Text>
          </Pressable>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabsScrollContent}>
            {["All", ...departments.map(d => d.name)].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable 
                  key={tab} 
                  style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search items by code, name, department..."
          resultCount={search.filtered.length}
          totalCount={filteredItems.length}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="CODE" active={sortKey === "item_code"} direction={sortDir} onPress={() => toggleSort("item_code")} textStyle={styles.columnHeader} containerStyle={{ width: 100 }} />
              <SortableHeaderCell label="CLIENT CODE" active={sortKey === "oem_company_code"} direction={sortDir} onPress={() => toggleSort("oem_company_code")} textStyle={styles.columnHeader} containerStyle={{ width: 120 }} />
              <SortableHeaderCell label="NAME" active={sortKey === "name"} direction={sortDir} onPress={() => toggleSort("name")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 200 }} />
              <Text style={[styles.columnHeader, { width: 150 }]}>DEPARTMENT</Text>
              <SortableHeaderCell label="UNIT" active={sortKey === "unit_of_measure"} direction={sortDir} onPress={() => toggleSort("unit_of_measure")} textStyle={styles.columnHeader} containerStyle={{ width: 80 }} />
              <Text style={[styles.columnHeader, { width: 100, textAlign: 'right' }]}>ACTIONS</Text>
            </View>

            {loading ? (
               <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
            ) : search.filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No items found.</Text>
              </View>
            ) : (
              pagination.pageRows.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.cellText, { width: 100, fontWeight: "600", color: "#111111" }]}>{item.item_code}</Text>
                  <Text style={[styles.cellText, { width: 120, color: "#6B7280" }]}>{item.oem_company_code || "-"}</Text>
                  <Text style={[styles.cellText, { flex: 1, minWidth: 200 }]}>{item.name}</Text>

                  <View style={{ width: 150, alignItems: "flex-start" }}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{getDepartmentName(item.department_id)}</Text>
                    </View>
                  </View>

                  <View style={{ width: 80, alignItems: "flex-start" }}>
                    <View style={styles.unitBadge}>
                      <Text style={styles.unitBadgeText}>{item.unit_of_measure}</Text>
                    </View>
                  </View>

                  <View style={{ width: 100, flexDirection: "row", justifyContent: "flex-end", gap: 16 }}>
                    <Pressable onPress={() => openEditModal(item)} hitSlop={10}>
                      <Feather name="edit-2" size={16} color="#6B7280" />
                    </Pressable>
                    <Pressable onPress={() => openQRModal(item)} hitSlop={10}>
                      <Feather name="maximize" size={16} color="#6B7280" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
        <Pagination {...pagination} />
      </ScrollView>

     {/* QR Code Modal (Printable Label Format) */}
      <Modal visible={isQRModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Item Label</Text>
              <Pressable onPress={() => setQRModalVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>
            
           <View style={styles.qrContainer}>
              {/* The actual QR Code Image now encodes ALL the text */}
              <Image 
                // Encodes ONLY the item code — same as the printed labels
                // (labels_api) — so the QR never changes when the name,
                // box qty etc. are edited. Only changing the code itself
                // would, and that asks for confirmation first.
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedItem?.item_code || "")}`
                }}
                style={styles.qrImage} 
              />
              <Text style={styles.qrTextString}>{selectedItem?.item_code}</Text>
              <Text style={styles.qrItemName}>{selectedItem?.name}</Text>


              </View>

            <Pressable style={styles.printBtn} onPress={() => Alert.alert("Print", "Sent to label printer.")}>
              <Feather name="printer" size={16} color="#374151" style={{ marginRight: 8 }} />
              <Text style={styles.printBtnText}>Print label</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit/Add Item Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedItem ? "Edit item" : "Add item"}</Text>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
              
              {/* Row 1: Internal Code & OEM Code */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Internal Code</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={form.item_code} 
                    onChangeText={(val) => setForm({ ...form, item_code: val })}
                  />
                </View>
              </View>
              {!!selectedItem?.id && form.item_code !== selectedItem.item_code && (
                <Text style={[styles.helperTextSmall, { color: "#B45309", marginTop: -8, marginBottom: 12 }]}>
                  Changing the code makes QR labels already printed for this item stop scanning.
                </Text>
              )}

              {/* Row 2: Department & Unit */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <SelectInput 
                    label="Department" 
                    placeholder="Select department" 
                    value={form.department_id} 
                    options={departments} 
                    onSelect={(val: string) => setForm({ ...form, department_id: val })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <UnitSelect
                    label="Unit"
                    value={form.unit_of_measure}
                    units={units}
                    onSelect={(val) => setForm({ ...form, unit_of_measure: val })}
                    onUnitsChanged={loadUnits}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={form.name} 
                  onChangeText={(val) => setForm({ ...form, name: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 72, textAlignVertical: "top" }]}
                  value={form.description}
                  multiline
                  placeholder="Shown next to the product when entering a customer PO"
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(val) => setForm({ ...form, description: val })}
                />
              </View>

              {isFinishedGoodDept(form.department_id) && (
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Client's product code</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.oem_company_code}
                      placeholder="The code your client uses for this"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={(val) => setForm({ ...form, oem_company_code: val })}
                    />
                    <Text style={styles.helperTextSmall}>Pre-filled on customer POs. Can be overridden per client on the PO itself.</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Price</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.price}
                      keyboardType="numeric"
                      onChangeText={(val) => setForm({ ...form, price: val })}
                    />
                  </View>
                </View>
              )}

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={form.category} 
                    onChangeText={(val) => setForm({ ...form, category: val })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Subcategory</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={form.subcategory} 
                    onChangeText={(val) => setForm({ ...form, subcategory: val })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pieces per scan</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={form.pcs_per_scan} 
                  keyboardType="numeric"
                  onChangeText={(val) => setForm({ ...form, pcs_per_scan: val })}
                />
                <Text style={[styles.helperTextUnderline, { marginTop: 8 }]}>Standard quantity entered each time this QR is scanned.</Text>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Box qty (pcs per box)</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={form.box_qty} 
                    keyboardType="numeric"
                    onChangeText={(val) => setForm({ ...form, box_qty: val })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Carton qty</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.carton_qty}
                    keyboardType="numeric"
                    onChangeText={(val) => setForm({ ...form, carton_qty: val })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Powder colour (moulded parts only)</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    {["", "White", "Grey", "Black"].map((c) => {
                      const active = form.powder_colour === c;
                      return (
                        <Pressable
                          key={c || "none"}
                          style={[styles.colourOption, active && styles.colourOptionActive]}
                          onPress={() => setForm({ ...form, powder_colour: c })}
                        >
                          <Text style={[styles.colourOptionText, active && styles.colourOptionTextActive]}>
                            {c || "N/A"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.helperTextSmall}>
                    Only Black/Grey moulded parts can be routed to the Colour department — White never can.
                  </Text>
                </View>
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.saveBtn} onPress={() => handleSaveItem()} disabled={isSaving}>
                <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Save item"}</Text>
              </Pressable>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg, gap: spacing.md },
  headerLeft: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  tabsContainer: { marginBottom: spacing.xl, backgroundColor: "#F3F4F6", alignSelf: "flex-start", borderRadius: 12, padding: 4, flexDirection: "row", maxHeight: 48 },
  tabsScrollContent: { flexDirection: "row", alignItems: "center" },
  tabBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  tabBadgeActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  tabTextActive: { color: "#111111", fontWeight: "600" },

  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 850, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, overflow: "hidden", minHeight: 300 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  
  typeBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  unitBadge: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  unitBadgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  emptyState: { paddingVertical: 80, justifyContent: "center", alignItems: "center" },
  emptyStateText: { fontSize: 15, color: "#6B7280" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111", flex: 1 },

  // --- QR Modal Styles ---
  qrModalCard: { width: "100%", maxWidth: 360, backgroundColor: colors.white, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  qrContainer: { alignItems: "center", marginBottom: 24 },
  qrImage: { width: 180, height: 180, marginBottom: 12 },
  qrTextString: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#111111", fontWeight: "800", letterSpacing: 1 },
  
  // New Label Details Box
  qrDetailsBox: { width: "100%", marginTop: 20, backgroundColor: "#F9FAFB", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  qrItemName: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 12, textAlign: "center" },
  qrDetailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  qrDetailLabel: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  qrDetailValue: { fontSize: 13, color: "#111111", fontWeight: "800" },

  printBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  printBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  
  editModalCard: { width: "100%", maxWidth: 600, backgroundColor: colors.white, borderRadius: 16, padding: 32, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  inputGroup: { marginBottom: 16, flex: 1 },
  formRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#111111", marginBottom: 8 },
  textInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, color: "#111111", height: 48 },
  colourOption: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  colourOptionActive: { backgroundColor: "#111111", borderColor: "#111111" },
  colourOptionText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  colourOptionTextActive: { color: colors.white },
  helperTextSmall: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
  selectInputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48 },
  inputText: { fontSize: 15, color: "#111111", flex: 1 },
  addUnitBox: { padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  comboInputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48 },
  comboTextInput: { flex: 1, fontSize: 15, color: "#111111", height: "100%" },
  comboIconBtn: { padding: 8, marginRight: -8 },
  
  helperTextUnderline: { fontSize: 13, color: "#6B7280", marginTop: -8, marginBottom: 16 },
  
  dropdownOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 300, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10 },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },

  modalFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  saveBtn: { backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10 },
  saveBtnText: { color: colors.white, fontWeight: "600", fontSize: 15 },
});