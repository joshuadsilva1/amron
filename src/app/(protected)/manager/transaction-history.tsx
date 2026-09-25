import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, FlatList, ActivityIndicator, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import TransactionService from "@/services/transactionService";
import { exportToExcel, exportToPDF } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

// --- Custom Dropdown Component ---
const SelectDropdown = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={{ flex: 1, minWidth: 200 }}>
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

export default function TransactionHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyData, deptsData] = await Promise.all([
        TransactionService.getChallanHistory().catch(() => []),
        TransactionService.getDepartments().catch(() => [])
      ]);

      setTransactions(historyData || []);
      
      // Format departments list for dropdown (adding an "All departments" option)
      setDepartments([
        { id: "", name: "All departments" },
        ...(deptsData || [])
      ]);
    } catch (error) {
      console.error("Failed to load transaction history", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic based on search and dropdowns
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.challan_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.product_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDept = selectedDept ? tx.department_id === selectedDept : true;
    const matchesProduct = selectedProduct ? tx.product_id === selectedProduct : true;

    return matchesSearch && matchesDept && matchesProduct;
  });

  const { sorted: sortedTransactions, sortKey, sortDir, toggleSort } = useSortable<any>(filteredTransactions);
  const pagination = usePagination(sortedTransactions);

  // Extract unique products list for product dropdown filter
  const productOptions = [
    { id: "", name: "All products" },
    ...Array.from(new Set(transactions.map(tx => tx.product_id)))
      .map(id => {
        const found = transactions.find(t => t.product_id === id);
        return { id, name: found?.product_name || "Unknown Product" };
      })
  ];

  const getExportData = () => ({
    headers: ["Challan", "Product", "Type", "Qty", "Department", "Date"],
    rows: filteredTransactions.map((tx) => [
      tx.challan_number || "-",
      tx.product_name || "-",
      tx.transaction_type,
      tx.quantity,
      tx.department_name || "-",
      tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "-",
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF("Transaction History", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel("transaction_history", headers, rows);
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
            <Text style={styles.title}>Transaction History</Text>
            <Text style={styles.subtitle}>
              Every stock movement, product-wise. Edit or delete any entry — live stock across all departments updates automatically.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.exportBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.exportTextPDF}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtnExcel} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.exportTextExcel}>Excel</Text>
            </Pressable>
          </View>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search product or chalan..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <SelectDropdown 
            placeholder="All departments" 
            value={selectedDept} 
            options={departments} 
            onSelect={setSelectedDept} 
          />

          <SelectDropdown 
            placeholder="All products" 
            value={selectedProduct} 
            options={productOptions} 
            onSelect={setSelectedProduct} 
          />
        </View>

        {/* Transaction Table / Empty State Container */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            {loading ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 80 }} />
            ) : filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No transactions found.</Text>
              </View>
            ) : (
              <View>
                <View style={styles.tableHeader}>
                  <SortableHeaderCell label="CHALLAN" active={sortKey === "challan_number"} direction={sortDir} onPress={() => toggleSort("challan_number")} textStyle={styles.columnHeader} containerStyle={{ width: 130 }} />
                  <SortableHeaderCell label="PRODUCT" active={sortKey === "product_name"} direction={sortDir} onPress={() => toggleSort("product_name")} textStyle={styles.columnHeader} containerStyle={{ width: 180 }} />
                  <SortableHeaderCell label="TYPE" active={sortKey === "transaction_type"} direction={sortDir} onPress={() => toggleSort("transaction_type")} textStyle={styles.columnHeader} containerStyle={{ width: 90 }} />
                  <SortableHeaderCell label="QTY" active={sortKey === "quantity"} direction={sortDir} onPress={() => toggleSort("quantity")} textStyle={styles.columnHeader} containerStyle={{ width: 80 }} />
                  <SortableHeaderCell label="DEPARTMENT" active={sortKey === "department_name"} direction={sortDir} onPress={() => toggleSort("department_name")} textStyle={styles.columnHeader} containerStyle={{ width: 150 }} />
                  <SortableHeaderCell label="DATE" active={sortKey === "created_at"} direction={sortDir} onPress={() => toggleSort("created_at")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 110 }} />
                </View>

                {pagination.pageRows.map((tx) => (
                  <View key={tx.id || Math.random()} style={styles.tableRow}>
                    <Text style={[styles.cellText, { width: 130, fontWeight: "600" }]}>{tx.challan_number || "-"}</Text>
                    <Text style={[styles.cellText, { width: 180 }]}>{tx.product_name || "-"}</Text>
                    <View style={{ width: 90 }}>
                      <View style={[styles.typeBadge, { backgroundColor: tx.transaction_type === "IN" ? "#DEF7EC" : "#FDE8E8" }]}>
                        <Text style={[styles.typeBadgeText, { color: tx.transaction_type === "IN" ? "#03543F" : "#9B1C1C" }]}>
                          {tx.transaction_type}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cellText, { width: 80, fontWeight: "700" }]}>{tx.quantity}</Text>
                    <Text style={[styles.cellText, { width: 150 }]}>{tx.department_name || "-"}</Text>
                    <Text style={[styles.cellText, { flex: 1, minWidth: 110, color: "#6B7280" }]}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "-"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
        <Pagination {...pagination} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { flexGrow: 1, padding: spacing.xl },
  
  // Header
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xl, gap: spacing.lg },
  headerLeft: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  
  headerActions: { flexDirection: "row", gap: 12 },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  exportTextPDF: { fontSize: 14, fontWeight: "600", color: colors.white },
  exportBtnExcel: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  exportTextExcel: { fontSize: 14, fontWeight: "600", color: "#374151" },

  // Filters Row
  filtersRow: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 12, marginBottom: spacing.xl, alignItems: "center" },
  searchBox: { flex: 2, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, height: 44, width: "100%" },
  searchInput: { flex: 1, fontSize: 14, color: "#111111" },

  inputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44, width: "100%" },
  inputText: { fontSize: 14, color: "#111111", flex: 1 },
  placeholderText: { color: "#9CA3AF" },

  // Table Card & Empty State
  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 800, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 300, overflow: "hidden" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  emptyStateText: { fontSize: 15, color: "#6B7280" },

  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },

  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  typeBadgeText: { fontSize: 12, fontWeight: "700" },

  // Dropdown Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },
});