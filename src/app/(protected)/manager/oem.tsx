import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator, Modal, TextInput, FlatList, KeyboardAvoidingView } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import OrderService, { OrderLineItem, ClubbedOrder } from "@/services/orderService";
import OEMService, { OEMMapping } from "@/services/oemService";
import ClientService, { Client } from "@/services/clientService";
import ItemService, { MasterItem } from "@/services/itemService";
import { exportToPDF } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

// --- Reusable Dropdown Component ---
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
                      {item.name}
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#D97706" },
  Clubbed: { bg: "#DBEAFE", text: "#2563EB" },
  In_Production: { bg: "#EDE9FE", text: "#7C3AED" },
  Dispatched: { bg: "#ECFDF5", text: "#10B981" },
};

export default function OEMConversionPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"client_wise" | "aggregated" | "mappings">("client_wise");

  const [clientOrders, setClientOrders] = useState<OrderLineItem[]>([]);
  const [aggregatedOrders, setAggregatedOrders] = useState<ClubbedOrder[]>([]);
  const [mappings, setMappings] = useState<OEMMapping[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);

  const clientOrdersSort = useSortable<OrderLineItem>(clientOrders);
  const aggregatedSort = useSortable<ClubbedOrder>(aggregatedOrders);
  const mappingsSort = useSortable<OEMMapping>(mappings);

  // Add Mapping modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [mapClientId, setMapClientId] = useState("");
  const [mapProductId, setMapProductId] = useState("");
  const [mapPartyCode, setMapPartyCode] = useState("");
  const [mapPartyProductName, setMapPartyProductName] = useState("");
  const [mapBoxType, setMapBoxType] = useState("");
  const [mapPiecesPerBox, setMapPiecesPerBox] = useState("");
  const [isSubmittingMapping, setIsSubmittingMapping] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportReport = async () => {
    try {
      if (activeTab === "client_wise") {
        await exportToPDF(
          "Purchase Orders — Client Wise",
          ["Client", "Chalan", "OEM Product", "Due Date", "Qty", "Status"],
          clientOrders.map((po) => [
            po.client_name,
            po.chalan_no || "-",
            po.oem_name || po.oem_code,
            po.due_date ? po.due_date.slice(0, 10) : "-",
            po.quantity,
            po.status,
          ])
        );
      } else {
        await exportToPDF(
          "Purchase Orders — Aggregated",
          ["Internal Code", "Product", "Category", "Total Qty"],
          aggregatedOrders.map((agg) => [
            agg.internal_code || "N/A",
            agg.product_name,
            agg.category,
            agg.total_quantity_to_manufacture,
          ])
        );
      }
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [orders, clubbed, mappingsData, clientsData, itemsData] = await Promise.all([
        OrderService.getOrders(),
        OrderService.getClubbedOrders(),
        OEMService.getMappings(),
        ClientService.getClients(),
        ItemService.getItems(),
      ]);

      setClientOrders(orders);
      setAggregatedOrders(clubbed);
      setMappings(mappingsData);
      setClients(clientsData);
      setMasterItems(itemsData);
    } catch (error) {
      console.error("Failed to load OEM data", error);
      Alert.alert("Error", "Failed to fetch data from the server.");
    } finally {
      setLoading(false);
    }
  };

  const openAddMappingModal = () => {
    setMapClientId(""); setMapProductId(""); setMapPartyCode("");
    setMapPartyProductName(""); setMapBoxType(""); setMapPiecesPerBox("");
    setModalVisible(true);
  };

  const handleCreateMapping = async () => {
    const client = clients.find((c) => c.id === mapClientId);
    const product = masterItems.find((i) => i.id === mapProductId);

    if (!client || !product || !mapPartyCode.trim()) {
      Alert.alert("Missing Info", "Client, internal product, and the client's product code are required.");
      return;
    }

    try {
      setIsSubmittingMapping(true);
      await OEMService.createMapping({
        party_name: client.name,
        party_code: mapPartyCode.trim(),
        internal_product: product.name,
        client_product_name: mapPartyProductName.trim() || undefined,
        box_type: mapBoxType.trim() || undefined,
        pieces_per_box: mapPiecesPerBox.trim() ? parseInt(mapPiecesPerBox, 10) : undefined,
      });
      Alert.alert("Success", "OEM mapping created.");
      setModalVisible(false);
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create mapping.");
    } finally {
      setIsSubmittingMapping(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Party Products (OEM)</Text>
            <Text style={styles.subtitle}>
              Every client PO's OEM code is resolved to your internal manufacturing code automatically —
              view it client-wise or aggregated across all clients.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.newPoBtn} onPress={() => router.push("/(protected)/manager/purchase-order/new")}>
              <Feather name="plus" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.newPoBtnText}>New PO</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExportReport}>
              <Feather name="file-text" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Export Report</Text>
            </Pressable>
          </View>
        </View>

        {/* View Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable 
            style={[styles.tabBtn, activeTab === "client_wise" && styles.tabBtnActive]} 
            onPress={() => setActiveTab("client_wise")}
          >
            <Feather name="users" size={16} color={activeTab === "client_wise" ? colors.white : "#6B7280"} style={{ marginRight: 8 }} />
            <Text style={[styles.tabText, activeTab === "client_wise" && styles.tabTextActive]}>Client POs (OEM View)</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "aggregated" && styles.tabBtnActive]}
            onPress={() => setActiveTab("aggregated")}
          >
            <Feather name="layers" size={16} color={activeTab === "aggregated" ? colors.white : "#6B7280"} style={{ marginRight: 8 }} />
            <Text style={[styles.tabText, activeTab === "aggregated" && styles.tabTextActive]}>Aggregated (Internal Code)</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "mappings" && styles.tabBtnActive]}
            onPress={() => setActiveTab("mappings")}
          >
            <Feather name="link" size={16} color={activeTab === "mappings" ? colors.white : "#6B7280"} style={{ marginRight: 8 }} />
            <Text style={[styles.tabText, activeTab === "mappings" && styles.tabTextActive]}>OEM Mappings</Text>
          </Pressable>

          {activeTab === "mappings" && (
            <Pressable style={styles.addMappingBtn} onPress={openAddMappingModal}>
              <Feather name="plus" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.newPoBtnText}>Add Mapping</Text>
            </Pressable>
          )}
        </View>

        {/* Tab Content */}
        <View style={styles.tableCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
          ) : activeTab === "client_wise" ? (
            // --- CLIENT WISE VIEW ---
            <View>
              <View style={styles.tableHeader}>
                <SortableHeaderCell label="CLIENT & CHALAN" active={clientOrdersSort.sortKey === "client_name"} direction={clientOrdersSort.sortDir} onPress={() => clientOrdersSort.toggleSort("client_name")} textStyle={styles.columnHeader} containerStyle={{ flex: 2 }} />
                <SortableHeaderCell label="OEM PRODUCT" active={clientOrdersSort.sortKey === "oem_name"} direction={clientOrdersSort.sortDir} onPress={() => clientOrdersSort.toggleSort("oem_name")} textStyle={styles.columnHeader} containerStyle={{ flex: 3 }} />
                <SortableHeaderCell label="DUE DATE" active={clientOrdersSort.sortKey === "due_date"} direction={clientOrdersSort.sortDir} onPress={() => clientOrdersSort.toggleSort("due_date")} textStyle={styles.columnHeader} containerStyle={{ flex: 1.5 }} />
                <SortableHeaderCell label="QTY" active={clientOrdersSort.sortKey === "quantity"} direction={clientOrdersSort.sortDir} onPress={() => clientOrdersSort.toggleSort("quantity")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, justifyContent: "flex-end" }} />
                <SortableHeaderCell label="STATUS" active={clientOrdersSort.sortKey === "status"} direction={clientOrdersSort.sortDir} onPress={() => clientOrdersSort.toggleSort("status")} textStyle={styles.columnHeader} containerStyle={{ flex: 1.5, justifyContent: "center" }} />
              </View>

              {clientOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No client POs found.</Text>
                </View>
              ) : (
                clientOrdersSort.sorted.map((po) => {
                  const statusStyle = STATUS_COLORS[po.status] || STATUS_COLORS.Pending;
                  return (
                    <View key={po.line_item_id} style={styles.tableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.cellTitle}>{po.client_name}</Text>
                        <Text style={styles.cellSubtitle}>{po.chalan_no || "No chalan #"}</Text>
                        {po.is_urgent && (
                          <View style={styles.urgentBadge}>
                            <Text style={styles.urgentText}>URGENT</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 3 }}>
                        <Text style={styles.cellTitle}>{po.oem_name || po.oem_code}</Text>
                        <Text style={styles.cellSubtitle}>
                          OEM Code: {po.oem_code} → {po.internal_code || "N/A"}
                        </Text>
                      </View>

                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.cellTitle}>{po.due_date ? po.due_date.slice(0, 10) : "—"}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cellTitle, { textAlign: "right", fontWeight: "700" }]}>
                          {po.quantity.toLocaleString()}
                        </Text>
                      </View>

                      <View style={{ flex: 1.5, alignItems: "center" }}>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                            {po.status.replace("_", " ")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : activeTab === "aggregated" ? (
            // --- AGGREGATED VIEW ---
            <View>
              <View style={styles.tableHeader}>
                <SortableHeaderCell label="INTERNAL CODE" active={aggregatedSort.sortKey === "internal_code"} direction={aggregatedSort.sortDir} onPress={() => aggregatedSort.toggleSort("internal_code")} textStyle={styles.columnHeader} containerStyle={{ flex: 1.5 }} />
                <SortableHeaderCell label="INTERNAL PRODUCT NAME" active={aggregatedSort.sortKey === "product_name"} direction={aggregatedSort.sortDir} onPress={() => aggregatedSort.toggleSort("product_name")} textStyle={styles.columnHeader} containerStyle={{ flex: 3 }} />
                <SortableHeaderCell label="CATEGORY" active={aggregatedSort.sortKey === "category"} direction={aggregatedSort.sortDir} onPress={() => aggregatedSort.toggleSort("category")} textStyle={styles.columnHeader} containerStyle={{ flex: 2 }} />
                <SortableHeaderCell label="TOTAL QTY" active={aggregatedSort.sortKey === "total_quantity_to_manufacture"} direction={aggregatedSort.sortDir} onPress={() => aggregatedSort.toggleSort("total_quantity_to_manufacture")} textStyle={styles.columnHeader} containerStyle={{ flex: 1.5, justifyContent: "flex-end" }} />
              </View>

              {aggregatedOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No pending orders to aggregate.</Text>
                </View>
              ) : (
                aggregatedSort.sorted.map((agg, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={[styles.cellTitle, { color: "#8B5CF6", fontWeight: "700" }]}>
                        {agg.internal_code || "N/A"}
                      </Text>
                    </View>

                    <View style={{ flex: 3 }}>
                      <Text style={styles.cellTitle}>{agg.product_name}</Text>
                    </View>

                    <View style={{ flex: 2 }}>
                      <Text style={styles.cellSubtitle}>{agg.category}</Text>
                    </View>

                    <View style={{ flex: 1.5 }}>
                      <Text style={[styles.cellTitle, { textAlign: "right", fontWeight: "900", fontSize: 16 }]}>
                        {agg.total_quantity_to_manufacture.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            // --- OEM MAPPINGS VIEW ---
            <View>
              <View style={styles.tableHeader}>
                <SortableHeaderCell label="CLIENT" active={mappingsSort.sortKey === "party_name"} direction={mappingsSort.sortDir} onPress={() => mappingsSort.toggleSort("party_name")} textStyle={styles.columnHeader} containerStyle={{ flex: 2 }} />
                <SortableHeaderCell label="THEIR CODE / PRODUCT" active={mappingsSort.sortKey === "party_code"} direction={mappingsSort.sortDir} onPress={() => mappingsSort.toggleSort("party_code")} textStyle={styles.columnHeader} containerStyle={{ flex: 2.5 }} />
                <SortableHeaderCell label="INTERNAL PRODUCT" active={mappingsSort.sortKey === "internal_product"} direction={mappingsSort.sortDir} onPress={() => mappingsSort.toggleSort("internal_product")} textStyle={styles.columnHeader} containerStyle={{ flex: 2.5 }} />
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>PACKAGING</Text>
              </View>

              {mappings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No OEM mappings yet. Tap "Add Mapping" to create one.</Text>
                </View>
              ) : (
                mappingsSort.sorted.map((m) => (
                  <View key={m.id} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.cellTitle}>{m.party_name}</Text>
                    </View>
                    <View style={{ flex: 2.5 }}>
                      <Text style={styles.cellTitle}>{m.party_code}</Text>
                      {m.client_product_name && <Text style={styles.cellSubtitle}>{m.client_product_name}</Text>}
                    </View>
                    <View style={{ flex: 2.5 }}>
                      <Text style={styles.cellTitle}>{m.internal_product}</Text>
                      {m.internal_code && <Text style={styles.cellSubtitle}>{m.internal_code}</Text>}
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.cellSubtitle}>
                        {m.box_type ? `${m.box_type}${m.pieces_per_box ? ` (${m.pieces_per_box}/box)` : ""}` : "-"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Add Mapping Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add OEM Mapping</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Client*</Text>
              <SelectInput
                placeholder="Select client..."
                value={mapClientId}
                options={clients.map((c) => ({ id: c.id, name: c.name }))}
                onSelect={setMapClientId}
              />
              {clients.length === 0 && (
                <Text style={styles.helperText}>No clients yet — add one under Clients first.</Text>
              )}

              <Text style={styles.inputLabel}>Internal Product*</Text>
              <SelectInput
                placeholder="Select internal product..."
                value={mapProductId}
                options={masterItems.map((i) => ({ id: i.id, name: `${i.name} (${i.item_code})` }))}
                onSelect={setMapProductId}
              />

              <Text style={styles.inputLabel}>Client's Product Code*</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HA101"
                placeholderTextColor="#9CA3AF"
                value={mapPartyCode}
                onChangeText={setMapPartyCode}
              />

              <Text style={styles.inputLabel}>Client's Product Name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="How the client refers to this product"
                placeholderTextColor="#9CA3AF"
                value={mapPartyProductName}
                onChangeText={setMapPartyProductName}
              />

              <Text style={styles.inputLabel}>Box Type (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Corrugated Box - Medium"
                placeholderTextColor="#9CA3AF"
                value={mapBoxType}
                onChangeText={setMapBoxType}
              />

              <Text style={styles.inputLabel}>Pieces per Box (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 100"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={mapPiecesPerBox}
                onChangeText={setMapPiecesPerBox}
              />

              <Pressable
                style={[styles.submitButton, isSubmittingMapping && styles.submitButtonDisabled]}
                onPress={handleCreateMapping}
                disabled={isSubmittingMapping}
              >
                {isSubmittingMapping ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Mapping</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
  // Header
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: Platform.OS === "web" ? "flex-start" : "stretch", marginBottom: spacing.xl, gap: 16 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  newPoBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  newPoBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  exportText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  // Tabs
  tabsContainer: { flexDirection: "row", gap: 12, marginBottom: spacing.lg },
  tabBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB" },
  tabBtnActive: { backgroundColor: "#111111", borderColor: "#111111" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: colors.white },
  addMappingBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginLeft: "auto" },

  // Table
  tableCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, overflow: "hidden", minHeight: 400 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", alignItems: "center" },
  cellTitle: { fontSize: 14, fontWeight: "600", color: "#111111", marginBottom: 2 },
  cellSubtitle: { fontSize: 13, color: "#6B7280" },

  // Badges
  urgentBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: "flex-start" },
  urgentText: { fontSize: 10, fontWeight: "800", color: "#EF4444" },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },

  emptyContainer: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },

  // Select dropdown (used inside the Add Mapping modal)
  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48, marginBottom: 4 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500", flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownEmptyText: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151", flex: 1 },

  // Add Mapping modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: Platform.OS === "ios" ? 48 : 32, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111" },
  closeIcon: { padding: 4 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 12 },
  helperText: { fontSize: 13, color: "#9CA3AF", marginTop: 4, marginBottom: 8 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, fontSize: 16, color: "#111111" },
  submitButton: { backgroundColor: "#8B5CF6", padding: 18, borderRadius: 14, alignItems: "center", marginTop: 24 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});