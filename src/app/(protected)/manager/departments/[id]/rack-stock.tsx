import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import { exportToExcel, exportToPDF } from "@/utils/export";

export default function RackStockPage() {
  const { id } = useLocalSearchParams();
  const [departmentName, setDepartmentName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [racks, setRacks] = useState<any[]>([]);

  useEffect(() => {
    const fetchPageData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Fetch department details AND this specific department's racks
        const [deptsRes, racksRes] = await Promise.all([
          api.get(`/departments/`),
          api.get(`/racks?department_id=${id}`)
        ]);
        
        const allDepts = deptsRes.data?.data || deptsRes.data || [];
        const currentDept = allDepts.find((d: any) => String(d.id) === String(id));
        setDepartmentName(currentDept?.name || "Unknown Department");
        
        setRacks(racksRes.data?.data || []);
      } catch (error) {
        console.warn("Failed to fetch department list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [id]);

  // Filter racks based on the search query
  const filteredRacks = racks.filter(rack =>
    rack.rack_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rack.description && rack.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getExportData = () => ({
    headers: ["Rack Code", "Capacity", "Description"],
    rows: filteredRacks.map((rack) => [
      rack.rack_code,
      rack.max_capacity_kg > 0 ? `${rack.max_capacity_kg}kg` : "Unlimited",
      rack.description || "-",
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF(`${departmentName} — Rack Stock`, headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel("rack_stock", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              {departmentName} — Rack Stock
            </Text>
            <Text style={styles.subtitle}>
              Racks configured for this department. Stock is tracked at the department level, not per rack —
              see the department's Stock Report for live item quantities.
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#9CA3AF" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rack..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content Section */}
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : filteredRacks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No racks match your search." : "No racks found in this department."}
            </Text>
          </View>
        ) : (
          <View style={styles.racksGrid}>
            {filteredRacks.map(rack => (
              <View key={rack.id} style={styles.rackCard}>
                <View style={styles.rackCardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="server" size={16} color="#8B5CF6" style={{ marginRight: 8 }} />
                    <Text style={styles.rackCode}>{rack.rack_code}</Text>
                  </View>
                  <Text style={styles.rackCapacity}>
                    Capacity: {rack.max_capacity_kg > 0 ? `${rack.max_capacity_kg}kg` : "Unlimited"}
                  </Text>
                </View>
                <Text style={styles.rackDesc}>{rack.description || "No description provided."}</Text>
                
                <View style={styles.rackContentsBox}>
                  <Text style={styles.placeholderText}>Per-rack item breakdown isn't tracked — this rack is a physical location label within {departmentName}'s department-level stock.</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: Platform.OS === "web" ? "flex-start" : "stretch", marginBottom: spacing.xl, gap: 16 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  
  headerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  pdfBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  pdfBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
  excelBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  excelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20, maxWidth: Platform.OS === "web" ? 400 : "100%" },
  searchInput: { flex: 1, fontSize: 15, color: "#111111", outlineStyle: "none" },

  racksGrid: { flexDirection: "column", gap: 16 },
  rackCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  rackCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  rackCode: { fontSize: 16, fontWeight: "800", color: "#111111" },
  rackCapacity: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  rackDesc: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  
  rackContentsBox: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed" },
  placeholderText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", fontStyle: "italic" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 40, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" }
});