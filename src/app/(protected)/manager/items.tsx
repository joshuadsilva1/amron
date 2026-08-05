import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Modal, Image, KeyboardAvoidingView, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

const UNIT_OPTIONS = ["pcs", "kg", "boxes", "meters"];

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

const ComboInput = ({ label, placeholder, value, options, onChangeText }: any) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.comboInputBox}>
        <TextInput
          style={styles.comboTextInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#9CA3AF"
        />
        <Pressable onPress={() => setModalVisible(true)} style={styles.comboIconBtn}>
          <Feather name="chevron-down" size={16} color="#9CA3AF" />
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.dropdownOption}
                  onPress={() => { onChangeText(item); setModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item && { color: "#8B5CF6", fontWeight: "700" }]}>
                    {item}
                  </Text>
                  {value === item && <Feather name="check" size={18} color="#8B5CF6" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function ItemsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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
    category: "",
    subcategory: "",
    pcs_per_scan: "1",
    price: "",
    box_qty: "",
    carton_qty: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, deptsRes] = await Promise.all([
        api.get('/items'),
        api.get('/departments')
      ]);
      setItems(itemsRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (id: string) => {
    return departments.find(d => String(d.id) === String(id))?.name || "-";
  };

  const filteredItems = items.filter(item =>
    activeTab === "All" ? true : getDepartmentName(item.department_id) === activeTab
  );
  const { sorted: sortedItems, sortKey, sortDir, toggleSort } = useSortable<any>(filteredItems);

  const openEditModal = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setForm({
        item_code: item.item_code || "",
        oem_company_code: item.oem_company_code || "",
        department_id: item.department_id || "",
        unit_of_measure: item.unit_of_measure || "pcs",
        name: item.name || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        pcs_per_scan: String(item.pcs_per_scan || "1"),
        price: String(item.price || ""),
        box_qty: String(item.box_qty || ""),
        carton_qty: String(item.carton_qty || "")
      });
    } else {
      setSelectedItem(null);
      setForm({
        item_code: "", oem_company_code: "", department_id: "", unit_of_measure: "pcs", 
        name: "", category: "", subcategory: "", pcs_per_scan: "1", price: "", box_qty: "", carton_qty: ""
      });
    }
    setEditModalVisible(true);
  };

  const openQRModal = (item: any) => {
    setSelectedItem(item);
    setQRModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!form.name || !form.department_id || !form.item_code) {
      Alert.alert("Missing Fields", "Code, Department, and Name are required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...form,
        pcs_per_scan: parseInt(form.pcs_per_scan) || 1,
        price: parseFloat(form.price) || 0.0,
        box_qty: parseInt(form.box_qty) || 0,
        carton_qty: parseInt(form.carton_qty) || 0
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="CODE" active={sortKey === "item_code"} direction={sortDir} onPress={() => toggleSort("item_code")} textStyle={styles.columnHeader} containerStyle={{ width: 100 }} />
              <SortableHeaderCell label="OEM CODE" active={sortKey === "oem_company_code"} direction={sortDir} onPress={() => toggleSort("oem_company_code")} textStyle={styles.columnHeader} containerStyle={{ width: 120 }} />
              <SortableHeaderCell label="NAME" active={sortKey === "name"} direction={sortDir} onPress={() => toggleSort("name")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 200 }} />
              <Text style={[styles.columnHeader, { width: 150 }]}>DEPARTMENT</Text>
              <SortableHeaderCell label="UNIT" active={sortKey === "unit_of_measure"} direction={sortDir} onPress={() => toggleSort("unit_of_measure")} textStyle={styles.columnHeader} containerStyle={{ width: 80 }} />
              <Text style={[styles.columnHeader, { width: 100, textAlign: 'right' }]}>ACTIONS</Text>
            </View>

            {loading ? (
               <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No items found.</Text>
              </View>
            ) : (
              sortedItems.map((item) => (
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
                source={{ 
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `Item: ${selectedItem?.name}\n` +
                    `Code: ${selectedItem?.item_code}\n` +
                    `OEM: ${selectedItem?.oem_company_code || "N/A"}\n` +
                    `Scan Qty: ${selectedItem?.pcs_per_scan} ${selectedItem?.unit_of_measure}\n` +
                    `Box Qty: ${selectedItem?.box_qty || "N/A"}\n` +
                    `Carton Qty: ${selectedItem?.carton_qty || "N/A"}`
                  )}` 
                }} 
                style={styles.qrImage} 
              />
              <Text style={styles.qrTextString}>{selectedItem?.item_code}</Text>


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
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>OEM Company Code</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={form.oem_company_code} 
                    placeholder="If provided by client"
                    onChangeText={(val) => setForm({ ...form, oem_company_code: val })}
                  />
                </View>
              </View>

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
                  <ComboInput 
                    label="Unit" 
                    placeholder="pcs" 
                    value={form.unit_of_measure} 
                    options={UNIT_OPTIONS} 
                    onChangeText={(val: string) => setForm({ ...form, unit_of_measure: val })}
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
                  <Text style={styles.inputLabel}>Price</Text>
                  <TextInput 
                    style={styles.textInput} 
                    value={form.price} 
                    keyboardType="numeric"
                    onChangeText={(val) => setForm({ ...form, price: val })}
                  />
                </View>
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
                <View style={{ flex: 1 }} />
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.saveBtn} onPress={handleSaveItem} disabled={isSaving}>
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
  selectInputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48 },
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