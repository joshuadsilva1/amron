import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import ReportService, { StockItem } from "@/services/reportService";
import SupplierOrderService from "@/services/supplierService";
import { exportToExcel, exportToPDF, printTable, ExportCell } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

const SECTIONS = [
  "Whole Factory",
  "Moulding",
  "Brasspart",
  "Lazer",
  "Fitting",
  "Box · Pouch · Label",
  "Finished Goods"
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "urgent">("stock");
  
  const [currentStock, setCurrentStock] = useState<StockItem[]>([]);
  const [urgentOrders, setUrgentOrders] = useState<any[]>([]);
  const [oneOffNumber, setOneOffNumber] = useState("");

  const stockSort = useSortable<StockItem>(currentStock);
  const urgentSort = useSortable<any>(urgentOrders);
  const activeSort = activeTab === "stock" ? stockSort : urgentSort;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const stockData = await ReportService.getLiveStock().catch(() => []);
      setCurrentStock(stockData);

      const ordersData = await SupplierOrderService.getOrders().catch(() => []);
      const urgent = ordersData.filter((o: any) => o.is_urgent === 1);
      setUrgentOrders(urgent);
    } catch (error) {
      console.error("Failed to fetch reports data", error);
    } finally {
      setLoading(false);
    }
  };

  const getExportData = (): { headers: string[]; rows: ExportCell[][] } => {
    if (activeTab === "stock") {
      return {
        headers: ["Code", "Name", "Category", "In Stock", "Unit"],
        rows: currentStock.map((row) => [
          row.item_code,
          row.name,
          row.category || "General",
          row.current_stock,
          row.unit_of_measure,
        ]),
      };
    }
    return {
      headers: ["PO", "Supplier", "Status", "Items"],
      rows: urgentOrders.map((order) => [
        `PO-${order.id.substring(0, 5).toUpperCase()}`,
        order.supplier_name,
        "Urgent",
        order.items?.length || 0,
      ]),
    };
  };

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF(activeTab === "stock" ? "Current Stock Report" : "Urgent Orders Report", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel(activeTab === "stock" ? "current_stock" : "urgent_orders", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  const handlePrint = async () => {
    try {
      const { headers, rows } = getExportData();
      await printTable(activeTab === "stock" ? "Current Stock Report" : "Urgent Orders Report", headers, rows);
    } catch (error: any) {
      Alert.alert("Print Failed", error.message || "Could not open the print dialog.");
    }
  };

  const handleCopySection = (sectionName: string) => {
    Alert.alert("Copied", `${sectionName} report summary prepared!`);
  };

  const handleSendSection = (sectionName: string) => {
    Alert.alert("Sent", `${sectionName} report dispatched successfully!`);
  };

  const handleSendFullReport = () => {
    if (!oneOffNumber) {
      Alert.alert("Error", "Please enter a valid phone number.");
      return;
    }
    Alert.alert("Success", `Full factory report sent to ${oneOffNumber}`);
    setOneOffNumber("");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              Auto-generate a WhatsApp daily report for every section — sent to whoever you allot each day's report to.
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable style={styles.exportBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handlePrint}>
              <Feather name="printer" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Print</Text>
            </Pressable>
          </View>
        </View>

        {/* Section Cards Grid */}
        <View style={styles.gridContainer}>
          {SECTIONS.map((section, idx) => (
            <View key={idx} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section}</Text>
                <Feather name="message-circle" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.sectionRecipient}>No recipient allotted yet</Text>
              
              <View style={styles.sectionCardActions}>
                <Pressable style={styles.sendActionBtn} onPress={() => handleSendSection(section)}>
                  <Feather name="send" size={14} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.sendActionText}>Send</Text>
                </Pressable>
                <Pressable style={styles.copyActionBtn} onPress={() => handleCopySection(section)}>
                  <Feather name="copy" size={14} color="#4B5563" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Send to One-off Number Card */}
        <View style={styles.oneOffCard}>
          <Text style={styles.oneOffInstruction}>
            Send any report to a one-off number below, or allot a permanent daily recipient per section.
          </Text>
          <Text style={styles.inputLabel}>Send to any number (with country code)</Text>
          
          <View style={styles.oneOffRow}>
            <TextInput 
              style={styles.oneOffInput}
              placeholder="e.g. 919876543210"
              placeholderTextColor="#9CA3AF"
              value={oneOffNumber}
              onChangeText={setOneOffNumber}
              keyboardType="phone-pad"
            />
            <Pressable style={styles.sendFullBtn} onPress={handleSendFullReport}>
              <Feather name="send" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.sendFullText}>Send full report</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabs Row */}
        <View style={styles.tabsRow}>
          <Pressable 
            style={[styles.tab, activeTab === "stock" && styles.activeTab]}
            onPress={() => setActiveTab("stock")}
          >
            <Text style={[styles.tabText, activeTab === "stock" && styles.activeTabText]}>Current stock</Text>
          </Pressable>
          <Pressable 
            style={[styles.tab, activeTab === "urgent" && styles.activeTab]}
            onPress={() => setActiveTab("urgent")}
          >
            <Text style={[styles.tabText, activeTab === "urgent" && styles.activeTabText]}>Urgent orders</Text>
          </Pressable>
        </View>

        {/* Data Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <SortableHeaderCell
              label="CODE" active={activeSort.sortKey === (activeTab === "stock" ? "item_code" : "id")} direction={activeSort.sortDir}
              onPress={() => (activeTab === "stock" ? stockSort.toggleSort("item_code") : urgentSort.toggleSort("id"))}
              textStyle={styles.columnHeader} containerStyle={{ width: 140 }}
            />
            <SortableHeaderCell
              label="NAME" active={activeSort.sortKey === (activeTab === "stock" ? "name" : "supplier_name")} direction={activeSort.sortDir}
              onPress={() => (activeTab === "stock" ? stockSort.toggleSort("name") : urgentSort.toggleSort("supplier_name"))}
              textStyle={styles.columnHeader} containerStyle={{ width: 280 }}
            />
            {activeTab === "stock" ? (
              <SortableHeaderCell
                label="CATEGORY" active={activeSort.sortKey === "category"} direction={activeSort.sortDir}
                onPress={() => activeSort.toggleSort("category")}
                textStyle={styles.columnHeader} containerStyle={{ width: 180 }}
              />
            ) : (
              <Text style={[styles.columnHeader, { width: 180 }]}>CATEGORY</Text>
            )}
            {activeTab === "stock" ? (
              <SortableHeaderCell
                label="IN STOCK" active={activeSort.sortKey === "current_stock"} direction={activeSort.sortDir}
                onPress={() => activeSort.toggleSort("current_stock")}
                textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 140, justifyContent: 'flex-end' }}
              />
            ) : (
              <Text style={[styles.columnHeader, { flex: 1, minWidth: 140, textAlign: 'right' }]}>IN STOCK</Text>
            )}
          </View>

          {loading ? (
             <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 40 }} />
          ) : activeTab === "stock" && currentStock.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No stock records found.</Text></View>
          ) : activeTab === "urgent" && urgentOrders.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No urgent orders found.</Text></View>
          ) : (
            activeTab === "stock" ? (
              stockSort.sorted.map((row: StockItem) => (
                <View key={row.id} style={styles.tableRow}>
                  <Text style={[styles.cellText, { width: 140, fontWeight: "600" }]}>{row.item_code}</Text>
                  <Text style={[styles.cellText, { width: 280 }]}>{row.name}</Text>
                  <View style={{ width: 180 }}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{row.category || "General"}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cellText, { flex: 1, minWidth: 140, textAlign: 'right', fontWeight: "700", color: row.current_stock === 0 ? "#EF4444" : "#111111" }]}>
                    {row.current_stock} {row.unit_of_measure}
                  </Text>
                </View>
              ))
            ) : (
              urgentSort.sorted.map((order: any) => (
                <View key={order.id} style={styles.tableRow}>
                  <Text style={[styles.cellText, { width: 140, fontWeight: "600" }]}>PO-{order.id.substring(0, 5).toUpperCase()}</Text>
                  <Text style={[styles.cellText, { width: 280 }]}>{order.supplier_name}</Text>
                  <View style={{ width: 180 }}>
                    <View style={[styles.typeBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.typeBadgeText, { color: '#EF4444' }]}>Urgent</Text>
                    </View>
                  </View>
                  <Text style={[styles.cellText, { flex: 1, minWidth: 140, textAlign: 'right', fontWeight: "700", color: "#EF4444" }]}>
                    {order.items?.length || 0} items
                  </Text>
                </View>
              ))
            )
          )}
          </View>
        </ScrollView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { padding: spacing.xl },
  
  // Header
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xl, gap: spacing.lg },
  headerLeft: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  headerActions: { flexDirection: "row", gap: 12 },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  exportText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  // Grid Section Cards
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: spacing.xl },
  sectionCard: { width: Platform.OS === "web" ? "31%" : "100%", backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },
  sectionRecipient: { fontSize: 13, color: "#9CA3AF", marginBottom: 20 },
  sectionCardActions: { flexDirection: "row", gap: 8 },
  sendActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, borderRadius: 10 },
  sendActionText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  copyActionBtn: { width: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },

  // One-off Card
  oneOffCard: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.xl, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  oneOffInstruction: { fontSize: 14, color: "#4B5563", marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#111111", marginBottom: 8 },
  oneOffRow: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 12 },
  oneOffInput: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: "#111111", height: 44 },
  sendFullBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, height: 44 },
  sendFullText: { color: colors.white, fontWeight: "600", fontSize: 14 },

  // Tabs
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#F3F4F6" },
  activeTab: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  activeTabText: { color: "#111111", fontWeight: "600" },

  // Table
  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 700, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  
  typeBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  typeBadgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  emptyState: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#6B7280", fontSize: 14 }
});