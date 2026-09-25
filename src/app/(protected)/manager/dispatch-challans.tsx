import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, FlatList, Platform, ActivityIndicator } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import DispatchChallanService from "@/services/dispatchChallanService";
import { exportToExcel, exportToPDF } from "@/utils/export";

// --- Custom Dropdown Component ---
const SelectInput = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={styles.inputBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.inputText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options || []}
              keyExtractor={(item) => item.id}
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

export default function DispatchChallansPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "dispatched">("pending");
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Real Data State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingChallans, setPendingChallans] = useState<any[]>([]);
  const [dispatchedChallans, setDispatchedChallans] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);

  // --- Modal Form State ---
  const [formChallanNo, setFormChallanNo] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formPo, setFormPo] = useState("");
  const [formNote, setFormNote] = useState("");
  
  // Dynamic Items State
  const [currentItem, setCurrentItem] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [addedItems, setAddedItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsData, posData, itemsData, challansData] = await Promise.all([
        DispatchChallanService.getClients().catch(() => []),
        DispatchChallanService.getPurchaseOrders().catch(() => []),
        DispatchChallanService.getItems().catch(() => []),
        DispatchChallanService.getChallans().catch(() => [])
      ]);

      setClients(clientsData);
      setPurchaseOrders(posData);
      setItemsList(itemsData);

      // Filter challans into tabs based on status
      setPendingChallans(challansData.filter((c: any) => c.status === "Pending"));
      setDispatchedChallans(challansData.filter((c: any) => c.status === "Dispatched"));

    } catch (error) {
      console.error("Failed to load dispatch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem || !currentQty) return;
    const itemDetails = itemsList.find(i => i.id === currentItem);
    setAddedItems([...addedItems, { 
      id: Math.random().toString(), 
      item_id: currentItem, 
      name: itemDetails?.name || "Unknown Item", 
      qty: currentQty 
    }]);
    setCurrentItem("");
    setCurrentQty("");
  };

  const removeAddedItem = (id: string) => {
    setAddedItems(addedItems.filter(item => item.id !== id));
  };

  const handleCreateChallan = async () => {
    if (!formChallanNo || addedItems.length === 0) {
      Alert.alert("Error", "Challan number and at least one item are required.");
      return;
    }

    try {
      setSubmitting(true);
      await DispatchChallanService.createChallan({
        challan_number: formChallanNo,
        client_id: formClient || undefined,
        purchase_order_id: formPo || undefined,
        note: formNote,
        items: addedItems.map(i => ({
          item_id: i.item_id,
          qty: parseFloat(i.qty)
        }))
      });

      Alert.alert("Success", "Dispatch challan created successfully.");
      setIsModalVisible(false);
      resetForm();
      fetchData(); // Refresh the list
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create challan");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormChallanNo(""); setFormClient(""); setFormPo(""); setFormNote("");
    setCurrentItem(""); setCurrentQty(""); setAddedItems([]);
  };

  // Determine which list to show based on active tab
  const activeList = activeTab === "pending" ? pendingChallans : dispatchedChallans;
  const search = useSearch(activeList);
  const pagination = usePagination(search.filtered);

  const getExportData = () => ({
    headers: ["Challan #", "Client", "Items", "Status"],
    rows: activeList.map((challan) => [
      challan.challan_number,
      challan.client_name !== "Optional" ? challan.client_name : "No Client",
      challan.items?.length || 0,
      challan.status,
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF(activeTab === "pending" ? "Pending Dispatch Challans" : "Dispatched Challans", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel(activeTab === "pending" ? "pending_challans" : "dispatched_challans", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Feather name="truck" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Dispatch Challans</Text>
              <Text style={styles.subtitle}>
                Create dispatch challans, confirm dispatch, and export the dispatched report.
              </Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable style={styles.exportBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => setIsModalVisible(true)}>
              <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>New challan</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable 
            style={[styles.tab, activeTab === "pending" && styles.activeTab]}
            onPress={() => setActiveTab("pending")}
          >
            <Text style={[styles.tabText, activeTab === "pending" && styles.activeTabText]}>
              Pending ({pendingChallans.length})
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.tab, activeTab === "dispatched" && styles.activeTab]}
            onPress={() => setActiveTab("dispatched")}
          >
            <Text style={[styles.tabText, activeTab === "dispatched" && styles.activeTabText]}>
              Dispatched ({dispatchedChallans.length})
            </Text>
          </Pressable>
        </View>

        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search challans by number, department, item..."
          resultCount={search.filtered.length}
          totalCount={activeList.length}
        />
        <Pagination {...pagination} />

        {/* List Content / Empty State */}
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 100 }} />
        ) : activeList.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Nothing here yet.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {pagination.pageRows.map((challan) => (
              <View key={challan.id} style={styles.challanCard}>
                <View>
                  <Text style={styles.challanTitle}>{challan.challan_number}</Text>
                  <Text style={styles.challanSubtitle}>
                    {challan.client_name !== "Optional" ? challan.client_name : "No Client"} • {challan.items?.length || 0} items
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{challan.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* New Dispatch Challan Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New dispatch challan</Text>
              <Pressable onPress={() => { setIsModalVisible(false); resetForm(); }} hitSlop={15}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              
              {/* Row 1: Challan Number & Client */}
              <View style={styles.formRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.label}>Challan number</Text>
                  <TextInput 
                    style={[styles.textInput, formChallanNo ? styles.textInputFocused : null]} 
                    value={formChallanNo} 
                    onChangeText={setFormChallanNo} 
                  />
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.label}>Client</Text>
                  <SelectInput placeholder="Optional" value={formClient} options={clients} onSelect={setFormClient} />
                </View>
              </View>

              {/* Row 2: Purchase Order */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Purchase order</Text>
                <SelectInput placeholder="Optional" value={formPo} options={purchaseOrders} onSelect={setFormPo} />
              </View>

              {/* Row 3: Items section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Items</Text>
                
                {/* Render Added Items */}
                {addedItems.map((item) => (
                  <View key={item.id} style={styles.addedItemRow}>
                    <Text style={styles.addedItemText}>{item.name} - {item.qty} qty</Text>
                    <Pressable onPress={() => removeAddedItem(item.id)}>
                      <Feather name="x" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}

                {/* Add Item Inputs */}
                <View style={styles.itemInputRow}>
                  <View style={{ flex: 3, marginRight: 8 }}>
                    <SelectInput placeholder="Select item..." value={currentItem} options={itemsList} onSelect={setCurrentItem} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput 
                      style={styles.textInput} 
                      placeholder="Qty" 
                      placeholderTextColor="#9CA3AF"
                      value={currentQty} 
                      onChangeText={setCurrentQty} 
                      keyboardType="numeric" 
                    />
                  </View>
                </View>
                
                {/* Add Item Button */}
                <Pressable style={styles.addItemBtn} onPress={handleAddItem}>
                  <Feather name="plus" size={14} color="#374151" style={{ marginRight: 4 }} />
                  <Text style={styles.addItemBtnText}>Add item</Text>
                </Pressable>
              </View>

              {/* Row 4: Note */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Note</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={formNote} 
                  onChangeText={setFormNote} 
                />
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Pressable 
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
                onPress={handleCreateChallan}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>{submitting ? "Creating..." : "Create challan"}</Text>
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
  contentArea: { padding: spacing.xl },
  
  // --- Header ---
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: Platform.OS === "web" ? "center" : "flex-start", marginBottom: spacing.xl, gap: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(139, 92, 246, 0.1)", alignItems: "center", justifyContent: "center", marginRight: spacing.lg },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  exportText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  // --- Tabs ---
  tabsContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, borderRadius: 20, alignSelf: "flex-start", marginBottom: spacing.xxl },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
  activeTab: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  activeTabText: { color: "#111111", fontWeight: "600" },

  // --- List & Empty State ---
  emptyStateContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  emptyStateText: { fontSize: 15, color: "#6B7280" },
  listContainer: { marginTop: spacing.md },
  challanCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, padding: spacing.lg, borderRadius: 12, marginBottom: spacing.md, borderWidth: 1, borderColor: "#E5E7EB" },
  challanTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 4 },
  challanSubtitle: { fontSize: 14, color: "#6B7280" },
  statusBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#D97706" },

  // --- Modal Styles ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 500, backgroundColor: colors.white, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111111" },
  modalScroll: { maxHeight: "80%" },
  
  formRow: { flexDirection: "row", marginHorizontal: -6, marginBottom: 16 }, 
  gridCol: { flex: 1, paddingHorizontal: 6 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#111111", marginBottom: 8 },
  
  // Inputs
  textInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: "#111111" },
  textInputFocused: { borderColor: "#8B5CF6" },
  
  inputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44 },
  inputText: { fontSize: 14, color: "#111111", flex: 1 },
  placeholderText: { color: "#9CA3AF" },

  // Add Items Section
  itemInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  addItemBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#F3F4F6", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  addItemBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  addedItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  addedItemText: { fontSize: 13, color: "#374151" },
  
  // Dropdown Modal
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },

  // Footer
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20 },
  submitBtn: { backgroundColor: "#8B5CF6", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
});