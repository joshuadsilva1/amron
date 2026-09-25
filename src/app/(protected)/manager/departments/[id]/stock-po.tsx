import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import { exportToExcel, exportToPDF } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

interface Comparison {
  component_id: string;
  component_name: string;
  item_code: string;
  unit_of_measure: string;
  required: number;
  in_stock: number;
  shortfall: number;
}

export default function StockVsPOPage() {
  const { id } = useLocalSearchParams();
  const [departmentName, setDepartmentName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const search = useSearch(comparisons);
  const { sorted: sortedComparisons, sortKey, sortDir, toggleSort } = useSortable<Comparison>(search.filtered);
  const pagination = usePagination(sortedComparisons);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        const [deptsRes, ordersRes, stockRes, itemsRes] = await Promise.all([
          api.get("/departments/"),
          api.get("/orders"),
          api.get(`/departments/${id}/stock`),
          api.get("/items"),
        ]);

        const allDepts = deptsRes.data?.data || deptsRes.data || [];
        const currentDept = allDepts.find((d: any) => String(d.id) === String(id));
        setDepartmentName(currentDept?.name || "Department");

        // Sum outstanding (not-yet-dispatched) quantity per finished good
        const orderRows = ordersRes.data?.orders || [];
        const remainingByProduct = new Map<string, number>();
        orderRows.forEach((row: any) => {
          if (row.status === "Dispatched") return;
          const remaining = (row.quantity || 0) - (row.dispatched_qty || 0);
          if (remaining <= 0) return;
          remainingByProduct.set(row.product_id, (remainingByProduct.get(row.product_id) || 0) + remaining);
        });

        if (remainingByProduct.size === 0) {
          setComparisons([]);
          return;
        }

        // Explode into aggregated raw-material requirements
        const explodeRes = await api.post("/recipes/explode", {
          orders: Array.from(remainingByProduct.entries()).map(([product_id, quantity]) => ({ product_id, quantity })),
        });
        const required: any[] = explodeRes.data?.data || [];

        // Only keep raw materials that actually belong to this department
        const items = itemsRes.data?.data || [];
        const deptItemIds = new Set(items.filter((i: any) => i.department_id === id).map((i: any) => i.id));

        const stockByItemId = new Map<string, number>();
        (stockRes.data?.stock || []).forEach((s: any) => stockByItemId.set(s.item_id, s.quantity_on_shelf));

        const result: Comparison[] = required
          .filter((r) => deptItemIds.has(r.component_id))
          .map((r) => {
            const inStock = stockByItemId.get(r.component_id) || 0;
            return {
              component_id: r.component_id,
              component_name: r.component_name,
              item_code: r.internal_code,
              unit_of_measure: r.original_unit,
              required: r.total_required_normalized,
              in_stock: inStock,
              shortfall: Math.max(0, r.total_required_normalized - inStock),
            };
          });

        setComparisons(result);
      } catch (error) {
        console.warn("Failed to fetch stock vs PO comparison:", error);
        setComparisons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF(
        `${departmentName} — Stock vs PO`,
        ["Material", "Code", "Required", "In Stock", "Shortfall"],
        comparisons.map((c) => [c.component_name, c.item_code, c.required, c.in_stock, c.shortfall])
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel(
        "stock_vs_po",
        ["Material", "Code", "Required", "In Stock", "Shortfall"],
        comparisons.map((c) => [c.component_name, c.item_code, c.required, c.in_stock, c.shortfall])
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  // Determine subtitle based on department name
  const getSubtitle = () => {
    const name = departmentName.toLowerCase();
    if (name.includes("moulding")) return "Moulds raw plastic/powder parts. Powder is auto-calculated from moulding weight.";
    if (name.includes("brasspart")) return "Brass components measured in gross. No weight/powder calculations.";
    return `Compare current stock against active purchase orders for the ${departmentName} team.`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              {departmentName} — Stock vs PO
            </Text>
            <Text style={styles.subtitle}>
              {getSubtitle()}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable style={styles.pdfBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.pdfBtnText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.excelBtn} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#374151" style={{ marginRight: 6 }} />
              <Text style={styles.excelBtnText}>Excel</Text>
            </Pressable>
          </View>
        </View>

        {/* Content Section */}
        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search materials by name or code..."
          resultCount={search.filtered.length}
          totalCount={comparisons.length}
        />
        <Pagination {...pagination} />

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : comparisons.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nothing to compare yet. Add purchase orders with recipes (BOM).
            </Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="MATERIAL" active={sortKey === "component_name"} direction={sortDir} onPress={() => toggleSort("component_name")} textStyle={styles.tableHeaderCell} containerStyle={{ flex: 2 }} />
              <SortableHeaderCell label="REQUIRED" active={sortKey === "required"} direction={sortDir} onPress={() => toggleSort("required")} textStyle={styles.tableHeaderCell} containerStyle={{ flex: 1, justifyContent: "flex-end" }} />
              <SortableHeaderCell label="IN STOCK" active={sortKey === "in_stock"} direction={sortDir} onPress={() => toggleSort("in_stock")} textStyle={styles.tableHeaderCell} containerStyle={{ flex: 1, justifyContent: "flex-end" }} />
              <SortableHeaderCell label="SHORTFALL" active={sortKey === "shortfall"} direction={sortDir} onPress={() => toggleSort("shortfall")} textStyle={styles.tableHeaderCell} containerStyle={{ flex: 1, justifyContent: "flex-end" }} />
            </View>
            {pagination.pageRows.map((c) => (
              <View key={c.component_id} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.cellName}>{c.component_name}</Text>
                  <Text style={styles.cellCode}>{c.item_code}</Text>
                </View>
                <Text style={[styles.cellValue, { flex: 1, textAlign: "right" }]}>{c.required} {c.unit_of_measure}</Text>
                <Text style={[styles.cellValue, { flex: 1, textAlign: "right" }]}>{c.in_stock} {c.unit_of_measure}</Text>
                <Text style={[styles.cellValue, { flex: 1, textAlign: "right", fontWeight: "700", color: c.shortfall > 0 ? "#EF4444" : "#059669" }]}>
                  {c.shortfall > 0 ? c.shortfall : "OK"}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F9FAFB" 
  },
  contentArea: { 
    paddingHorizontal: spacing.xl, 
    paddingBottom: spacing.xl, 
    paddingTop: spacing.sm 
  },
  
  // Header
  headerRow: { 
    flexDirection: Platform.OS === "web" ? "row" : "column", 
    justifyContent: "space-between", 
    alignItems: Platform.OS === "web" ? "flex-start" : "stretch", 
    marginBottom: spacing.xl,
    gap: 16
  },
  headerTextContainer: { 
    flex: 1 
  },
  title: { 
    fontSize: 32, 
    fontWeight: "900", 
    color: "#111111", 
    letterSpacing: -0.5, 
    marginBottom: 6 
  },
  subtitle: { 
    fontSize: 15, 
    color: "#6B7280", 
    lineHeight: 22 
  },
  
  // Header Buttons
  headerActions: { 
    flexDirection: "row", 
    gap: 12,
    alignItems: "center"
  },
  pdfBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#8B5CF6", 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20 
  },
  pdfBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: colors.white 
  },
  excelBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#F3F4F6", 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20 
  },
  excelBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#374151" 
  },

  // Empty State Card
  emptyCard: { 
    backgroundColor: colors.white, 
    borderRadius: 16, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: "#E5E7EB", 
    shadowColor: "#000", 
    shadowOpacity: 0.02, 
    shadowRadius: 10, 
    elevation: 2,
    minHeight: 100,
    justifyContent: "center"
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280"
  },

  tableCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tableHeaderCell: { fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellName: { fontSize: 14, fontWeight: "600", color: "#111111" },
  cellCode: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  cellValue: { fontSize: 14, color: "#374151" },
});