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

export default function ManageRacksPage() {
  const [loading, setLoading] = useState(true);
  const [racks, setRacks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("All");

  const [selectedRack, setSelectedRack] = useState<any | null>(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isQRModalVisible, setQRModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    rack_code: "",
    department_id: "",
    description: "",
    max_capacity_kg: "0"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [racksRes, deptsRes] = await Promise.all([
        api.get('/racks'),
        api.get('/departments')
      ]);
      setRacks(racksRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
    } catch (error) {
      console.error("Failed to load racks", error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (id: string) => {
    return departments.find(d => String(d.id) === String(id))?.name || "-";
  };

  const filteredRacks = racks.filter(rack =>
    activeTab === "All" ? true : getDepartmentName(rack.department_id) === activeTab
  );
  const search = useSearch(filteredRacks, (r: any) => `${Object.values(r).join(" ")} ${getDepartmentName(r.department_id)}`);
  const { sorted: sortedRacks, sortKey, sortDir, toggleSort } = useSortable<any>(search.filtered);

  const openEditModal = (rack?: any) => {
    if (rack) {
      setSelectedRack(rack);
      setForm({
        rack_code: rack.rack_code || "",
        department_id: rack.department_id || "",
        description: rack.description || "",
        max_capacity_kg: String(rack.max_capacity_kg || "0"),
      });
    } else {
      setSelectedRack(null);
      setForm({ rack_code: "", department_id: "", description: "", max_capacity_kg: "0" });
    }
    setEditModalVisible(true);
  };

  const openQRModal = (rack: any) => {
    setSelectedRack(rack);
    setQRModalVisible(true);
  };

  const handleSaveRack = async () => {
    if (!form.rack_code || !form.department_id) {
      Alert.alert("Missing Fields", "Rack Code and Department are required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...form,
        max_capacity_kg: parseFloat(form.max_capacity_kg) || 0.0
      };

      if (selectedRack?.id) {
        await api.put(`/racks/${selectedRack.id}`, payload);
        Alert.alert("Success", "Rack updated successfully.");
      } else {
        await api.post("/racks", payload);
        Alert.alert("Success", "Rack created successfully.");
      }
      setEditModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save rack.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Racks & Storage</Text>
            <Text style={styles.subtitle}>
              Manage physical storage locations across the factory and print QR codes for shelves.
            </Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => openEditModal()}>
            <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Add rack</Text>
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
          placeholder="Search racks..."
          resultCount={search.filtered.length}
          totalCount={filteredRacks.length}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="RACK CODE" active={sortKey === "rack_code"} direction={sortDir} onPress={() => toggleSort("rack_code")} textStyle={styles.columnHeader} containerStyle={{ width: 120 }} />
              <Text style={[styles.columnHeader, { width: 150 }]}>DEPARTMENT</Text>
              <SortableHeaderCell label="DESCRIPTION" active={sortKey === "description"} direction={sortDir} onPress={() => toggleSort("description")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 200 }} />
              <SortableHeaderCell label="CAPACITY" active={sortKey === "max_capacity_kg"} direction={sortDir} onPress={() => toggleSort("max_capacity_kg")} textStyle={styles.columnHeader} containerStyle={{ width: 100 }} />
              <Text style={[styles.columnHeader, { width: 100, textAlign: 'right' }]}>ACTIONS</Text>
            </View>

            {loading ? (
               <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
            ) : search.filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No racks configured yet.</Text>
              </View>
            ) : (
              sortedRacks.map((rack) => (
                <View key={rack.id} style={styles.tableRow}>
                  <Text style={[styles.cellText, { width: 120, fontWeight: "700", color: "#111111" }]}>{rack.rack_code}</Text>

                  <View style={{ width: 150, alignItems: "flex-start" }}>
                    <View style={styles.deptBadge}>
                      <Text style={styles.deptBadgeText}>{getDepartmentName(rack.department_id)}</Text>
                    </View>
                  </View>

                  <Text style={[styles.cellText, { flex: 1, minWidth: 200, color: "#6B7280" }]} numberOfLines={1}>
                    {rack.description || "-"}
                  </Text>

                  <Text style={[styles.cellText, { width: 100, color: "#4B5563" }]}>
                    {rack.max_capacity_kg > 0 ? `${rack.max_capacity_kg} kg` : "Unlimited"}
                  </Text>

                  <View style={{ width: 100, flexDirection: "row", justifyContent: "flex-end", gap: 16 }}>
                    <Pressable onPress={() => openEditModal(rack)} hitSlop={10}>
                      <Feather name="edit-2" size={16} color="#6B7280" />
                    </Pressable>
                    <Pressable onPress={() => openQRModal(rack)} hitSlop={10}>
                      <Feather name="maximize" size={16} color="#6B7280" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* QR Code Label Modal */}
      <Modal visible={isQRModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rack Location Label</Text>
              <Pressable onPress={() => setQRModalVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>
            
            <View style={styles.qrContainer}>
              {/* IMPORTANT: The QR Payload is ONLY the rack code, so the camera scanner reads it perfectly */}
              <Image 
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedRack?.rack_code || "N/A")}` }} 
                style={styles.qrImage} 
              />
              <Text style={styles.qrTextString}>{selectedRack?.rack_code}</Text>

              <View style={styles.qrDetailsBox}>
                <View style={styles.qrDetailRow}>
                  <Text style={styles.qrDetailLabel}>Department:</Text>
                  <Text style={styles.qrDetailValue}>{getDepartmentName(selectedRack?.department_id)}</Text>
                </View>
                <View style={styles.qrDetailRow}>
                  <Text style={styles.qrDetailLabel}>Desc:</Text>
                  <Text style={styles.qrDetailValue} numberOfLines={1}>{selectedRack?.description || "N/A"}</Text>
                </View>
              </View>
            </View>

            <Pressable style={styles.printBtn} onPress={() => Alert.alert("Print", "Sent to label printer.")}>
              <Feather name="printer" size={16} color="#374151" style={{ marginRight: 8 }} />
              <Text style={styles.printBtnText}>Print Location Tag</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Rack Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRack ? "Edit Rack" : "Add Rack"}</Text>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Rack Code</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={form.rack_code} 
                  placeholder="e.g. RACK-A1"
                  autoCapitalize="characters"
                  onChangeText={(val) => setForm({ ...form, rack_code: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SelectInput 
                  label="Department" 
                  placeholder="Assign department" 
                  value={form.department_id} 
                  options={departments} 
                  onSelect={(val: string) => setForm({ ...form, department_id: val })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput 
                style={styles.textInput} 
                value={form.description} 
                placeholder="e.g. Top shelf near the entrance"
                onChangeText={(val) => setForm({ ...form, description: val })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Capacity (kg)</Text>
              <TextInput 
                style={[styles.textInput, { width: '50%' }]} 
                value={form.max_capacity_kg} 
                keyboardType="numeric"
                onChangeText={(val) => setForm({ ...form, max_capacity_kg: val })}
              />
              <Text style={styles.helperTextUnderline}>Enter 0 for unlimited capacity.</Text>
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.saveBtn} onPress={handleSaveRack} disabled={isSaving}>
                <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Save Rack"}</Text>
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
  
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  tabsContainer: { marginBottom: spacing.xl, backgroundColor: "#F3F4F6", alignSelf: "flex-start", borderRadius: 12, padding: 4, flexDirection: "row", maxHeight: 48 },
  tabsScrollContent: { flexDirection: "row", alignItems: "center" },
  tabBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  tabBadgeActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  tabTextActive: { color: "#111111", fontWeight: "600" },

  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 700, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, overflow: "hidden", minHeight: 300 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  
  deptBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  deptBadgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  emptyState: { paddingVertical: 80, justifyContent: "center", alignItems: "center" },
  emptyStateText: { fontSize: 15, color: "#6B7280" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111111", flex: 1 },

  qrModalCard: { width: "100%", maxWidth: 360, backgroundColor: colors.white, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  qrContainer: { alignItems: "center", marginBottom: 24 },
  qrImage: { width: 180, height: 180, marginBottom: 12 },
  qrTextString: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#111111", fontWeight: "800", letterSpacing: 1 },
  
  qrDetailsBox: { width: "100%", marginTop: 20, backgroundColor: "#F9FAFB", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  qrDetailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  qrDetailLabel: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  qrDetailValue: { fontSize: 13, color: "#111111", fontWeight: "800" },

  printBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  printBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },

  editModalCard: { width: "100%", maxWidth: 500, backgroundColor: colors.white, borderRadius: 16, padding: 32, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  inputGroup: { marginBottom: 16, flex: 1 },
  formRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#111111", marginBottom: 8 },
  textInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, color: "#111111", height: 48 },
  
  selectInputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48 },
  inputText: { fontSize: 15, color: "#111111" },
  
  helperTextUnderline: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  
  dropdownOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 300, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10 },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },

  modalFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  saveBtn: { backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10 },
  saveBtnText: { color: colors.white, fontWeight: "600", fontSize: 15 },
});