import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import ReportService, { StockItem } from "@/services/reportService";
import TransactionService from "@/services/transactionService";
import { exportToExcel, exportToPDF, ExportCell } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

interface DepartmentOption { id: string; name: string; level: number; }

export default function StocksReportPage() {
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Department Order State (reordering which department's table shows first)
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Period Filter State
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Column Format Toggles State
  const [columns, setColumns] = useState({
    code: true,
    itemName: true,
    in: true,
    out: true,
    periodNet: true,
    liveStock: true,
    price: false,
  });

  const { sorted: sortedStockItems, sortKey, sortDir, toggleSort } = useSortable<StockItem>(stockItems);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const [stockData, deptData] = await Promise.all([
        ReportService.getLiveStock().catch(() => []),
        TransactionService.getDepartments().catch(() => []),
      ]);
      setStockItems(stockData || []);
      setDepartments(
        [...(deptData || [])].sort((a: DepartmentOption, b: DepartmentOption) => a.level - b.level)
      );
    } catch (error) {
      console.error("Failed to load stock report", error);
    } finally {
      setLoading(false);
    }
  };

  const moveDepartment = (index: number, direction: 'up' | 'down') => {
    const reordered = [...departments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reordered.length) return;

    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    setDepartments(reordered);
  };

  const toggleColumn = (key: keyof typeof columns) => {
    setColumns({ ...columns, [key]: !columns[key] });
  };

  const COLUMN_DEFS: { key: keyof typeof columns; label: string; getValue: (item: StockItem) => ExportCell }[] = [
    { key: "code", label: "Code", getValue: (i) => i.item_code },
    { key: "itemName", label: "Item Name", getValue: (i) => i.name },
    { key: "in", label: "In", getValue: () => 0 },
    { key: "out", label: "Out", getValue: () => 0 },
    { key: "periodNet", label: "Period Net", getValue: () => 0 },
    { key: "liveStock", label: "Live Stock", getValue: (i) => i.current_stock },
    { key: "price", label: "Price", getValue: () => "-" },
  ];

  const getExportData = (): { headers: string[]; rows: ExportCell[][] } => {
    const activeCols = COLUMN_DEFS.filter((c) => columns[c.key]);
    const headers = ["Department", ...activeCols.map((c) => c.label)];
    const rows: ExportCell[][] = [];
    departments.forEach((dept) => {
      const filteredItems = stockItems.filter((item) => item.department_id === dept.id);
      filteredItems.forEach((item) => {
        rows.push([dept.name, ...activeCols.map((c) => c.getValue(item))]);
      });
    });
    return { headers, rows };
  };

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF("Stock Report", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel("stock_report", headers, rows);
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
            <Text style={styles.title}>Stock Report</Text>
            <Text style={styles.subtitle}>
              Format your report: choose which product type shows first, pick your columns, then export to PDF or Excel.
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>PDF</Text>
            </Pressable>
          </View>
        </View>

        {/* Main Workspace Layout */}
        <View style={styles.workspaceRow}>
          
          {/* Left Configuration Column */}
          <View style={styles.configColumn}>
            
            {/* Period Card */}
            <View style={styles.configCard}>
              <Text style={styles.configCardTitle}>Period (for In / Out / Net)</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.inputLabel}>From</Text>
                  <View style={styles.dateInputBox}>
                    <TextInput 
                      style={styles.dateInputText} 
                      placeholder="dd/mm/yyyy" 
                      placeholderTextColor="#9CA3AF"
                      value={dateFrom}
                      onChangeText={setDateFrom}
                    />
                    <Feather name="calendar" size={14} color="#6B7280" />
                  </View>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.inputLabel}>To</Text>
                  <View style={styles.dateInputBox}>
                    <TextInput 
                      style={styles.dateInputText} 
                      placeholder="dd/mm/yyyy" 
                      placeholderTextColor="#9CA3AF"
                      value={dateTo}
                      onChangeText={setDateTo}
                    />
                    <Feather name="calendar" size={14} color="#6B7280" />
                  </View>
                </View>
              </View>
              <Text style={styles.helperText}>Live Stock always reflects the all-time balance.</Text>
            </View>

            {/* Department Order Card */}
            <View style={styles.configCard}>
              <Text style={styles.configCardTitle}>Department order (which shows first)</Text>
              {departments.map((dept, idx) => (
                <View key={dept.id} style={styles.orderRow}>
                  <Text style={styles.orderIndex}>{idx + 1}</Text>
                  <Text style={styles.orderCategoryName}>{dept.name}</Text>
                  <View style={styles.orderArrows}>
                    <Pressable onPress={() => moveDepartment(idx, 'up')} disabled={idx === 0} hitSlop={5}>
                      <Feather name="arrow-up" size={14} color={idx === 0 ? "#D1D5DB" : "#374151"} style={{ marginRight: 8 }} />
                    </Pressable>
                    <Pressable onPress={() => moveDepartment(idx, 'down')} disabled={idx === departments.length - 1} hitSlop={5}>
                      <Feather name="arrow-down" size={14} color={idx === departments.length - 1 ? "#D1D5DB" : "#374151"} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            {/* Columns / Format Card */}
            <View style={styles.configCard}>
              <Text style={styles.configCardTitle}>Columns / format</Text>
              {[
                { key: 'code', label: 'Code' },
                { key: 'itemName', label: 'Item Name' },
                { key: 'in', label: 'In' },
                { key: 'out', label: 'Out' },
                { key: 'periodNet', label: 'Period Net' },
                { key: 'liveStock', label: 'Live Stock' },
                { key: 'price', label: 'Price' },
              ].map((col) => {
                const isChecked = columns[col.key as keyof typeof columns];
                return (
                  <Pressable key={col.key} style={styles.checkboxRow} onPress={() => toggleColumn(col.key as any)}>
                    <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                      {isChecked && <Feather name="check" size={12} color={colors.white} />}
                    </View>
                    <Text style={styles.checkboxLabel}>{col.label}</Text>
                  </Pressable>
                );
              })}
            </View>

          </View>

          {/* Right Tables Column */}
          <View style={styles.tablesColumn}>
            {loading ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
            ) : departments.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyRowText}>No departments found.</Text>
              </View>
            ) : (
              departments.map((dept) => {
                // Filter items belonging to this department
                const filteredItems = sortedStockItems.filter((item) => item.department_id === dept.id);

                return (
                  <View key={dept.id} style={styles.tableCard}>
                    {/* Table Section Header */}
                    <View style={styles.tableSectionTitleBar}>
                      <Text style={styles.tableSectionTitleText}>{dept.name}</Text>
                    </View>

                    {/* Table Column Headers */}
                    <View style={styles.tableHeaderRow}>
                      {columns.code && (
                        <SortableHeaderCell
                          label="CODE" active={sortKey === "item_code"} direction={sortDir}
                          onPress={() => toggleSort("item_code")}
                          textStyle={styles.tableHeaderCell} containerStyle={{ flex: 1.2 }}
                        />
                      )}
                      {columns.itemName && (
                        <SortableHeaderCell
                          label="ITEM NAME" active={sortKey === "name"} direction={sortDir}
                          onPress={() => toggleSort("name")}
                          textStyle={styles.tableHeaderCell} containerStyle={{ flex: 3 }}
                        />
                      )}
                      {columns.in && <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>IN</Text>}
                      {columns.out && <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>OUT</Text>}
                      {columns.periodNet && <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>PERIOD NET</Text>}
                      {columns.liveStock && (
                        <SortableHeaderCell
                          label="LIVE STOCK" active={sortKey === "current_stock"} direction={sortDir}
                          onPress={() => toggleSort("current_stock")}
                          textStyle={styles.tableHeaderCell} containerStyle={{ flex: 1, justifyContent: 'flex-end' }}
                        />
                      )}
                      {columns.price && <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>PRICE</Text>}
                    </View>

                    {filteredItems.length === 0 ? (
                      <View style={styles.emptyRow}>
                        <Text style={styles.emptyRowText}>No items in this department.</Text>
                      </View>
                    ) : (
                      filteredItems.map((item) => (
                        <View key={item.id} style={styles.tableDataRow}>
                          {columns.code && <Text style={[styles.tableDataCell, { flex: 1.2, fontWeight: "600" }]}>{item.item_code}</Text>}
                          {columns.itemName && <Text style={[styles.tableDataCell, { flex: 3 }]}>{item.name}</Text>}
                          {columns.in && <Text style={[styles.tableDataCell, { flex: 1, textAlign: 'right' }]}>0</Text>}
                          {columns.out && <Text style={[styles.tableDataCell, { flex: 1, textAlign: 'right' }]}>0</Text>}
                          {columns.periodNet && <Text style={[styles.tableDataCell, { flex: 1, textAlign: 'right' }]}>0</Text>}
                          {columns.liveStock && (
                            <Text style={[styles.tableDataCell, { flex: 1, textAlign: 'right', fontWeight: "700", color: "#111111" }]}>
                              {item.current_stock}
                            </Text>
                          )}
                          {columns.price && <Text style={[styles.tableDataCell, { flex: 1, textAlign: 'right' }]}>-</Text>}
                        </View>
                      ))
                    )}
                  </View>
                );
              })
            )}
          </View>

        </View>

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
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  exportText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  // Workspace
  workspaceRow: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 24, alignItems: "flex-start" },
  configColumn: { width: Platform.OS === "web" ? 340 : "100%", gap: 16 },
  tablesColumn: { flex: 1, width: "100%", gap: 20 },

  // Config Cards
  configCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  configCardTitle: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 14 },
  
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dateCol: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 6 },
  dateInputBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 10, height: 38 },
  dateInputText: { flex: 1, fontSize: 13, color: "#111111" },
  helperText: { fontSize: 11, color: "#9CA3AF" },

  // Order List
  orderRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 },
  orderIndex: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginRight: 12, width: 14 },
  orderCategoryName: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  orderArrows: { flexDirection: "row", alignItems: "center" },

  // Checkboxes
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkboxBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxBoxChecked: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  checkboxLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },

  // Tables
  tableCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  tableSectionTitleBar: { backgroundColor: "#1E293B", paddingVertical: 12, paddingHorizontal: 20 },
  tableSectionTitleText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tableHeaderCell: { fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  
  tableDataRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tableDataCell: { fontSize: 13, color: "#374151" },

  emptyRow: { paddingVertical: 20, paddingHorizontal: 20 },
  emptyRowText: { fontSize: 13, color: "#9CA3AF" },
});