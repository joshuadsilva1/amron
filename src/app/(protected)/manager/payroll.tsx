import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import PayrollService, { PayrollSummary } from "@/services/payrollService"; // Using your existing service
import { exportToExcel, exportToPDF } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

// Helper to format the month string for the UI (e.g., "July 2026")
const formatMonthYearUI = (date: Date) => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

// Formats currency to Indian Rupees
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
};

export default function EmployeePayrollPage() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Defaulting to July 2026 
  
  const [payrollData, setPayrollData] = useState<PayrollSummary[]>([]);
  const [totalPayout, setTotalPayout] = useState(0);

  const { sorted: sortedPayroll, sortKey, sortDir, toggleSort } = useSortable<PayrollSummary>(payrollData);

  useEffect(() => {
    fetchPayroll();
  }, [currentDate]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      
      // Formatting to YYYY-MM based on typical string month parameters
      const year = currentDate.getFullYear();
      const monthNum = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const apiMonthParam = `${year}-${monthNum}`;
      
      const data = await PayrollService.getPayrollReport(apiMonthParam);
      
      setPayrollData(data || []);
      
      // Calculate total payout from the returned array
      const total = data?.reduce((sum, record) => sum + (record.total_payable || 0), 0) || 0;
      setTotalPayout(total);
      
    } catch (error) {
      console.error("Failed to load payroll data", error);
    } finally {
      setLoading(false);
    }
  };

  // Simple handlers to cycle months
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getExportData = () => ({
    headers: ["Employee", "Base", "Days Worked", "Payout"],
    rows: payrollData.map((record) => [
      record.worker_name,
      formatCurrency(record.base_salary),
      record.total_days_worked,
      formatCurrency(record.total_payable),
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF(`Payroll — ${formatMonthYearUI(currentDate)}`, headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel("payroll", headers, rows);
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
              <Feather name="credit-card" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Employee Payroll</Text>
              <Text style={styles.subtitle}>
                Monthly payout auto-calculated from attendance and base salary.
              </Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable style={styles.primaryBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
          </View>
        </View>

        {/* Date Controls & Summary Row */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>Month</Text>
            <View style={styles.datePickerWrapper}>
              <Pressable onPress={prevMonth} hitSlop={10}>
                <Feather name="chevron-left" size={16} color="#9CA3AF" />
              </Pressable>
              
              <Text style={styles.datePickerText}>{formatMonthYearUI(currentDate)}</Text>
              
              <Pressable onPress={nextMonth} hitSlop={10} style={{ marginRight: 12 }}>
                <Feather name="chevron-right" size={16} color="#9CA3AF" />
              </Pressable>
              
              <Feather name="calendar" size={16} color="#111111" />
            </View>
          </View>

          <View style={styles.summaryRight}>
            <Text style={styles.totalPayoutLabel}>Total payout: </Text>
            <Text style={styles.totalPayoutValue}>{formatCurrency(totalPayout)}</Text>
          </View>
        </View>

        {/* Payroll Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <SortableHeaderCell label="EMPLOYEE" active={sortKey === "worker_name"} direction={sortDir} onPress={() => toggleSort("worker_name")} textStyle={styles.columnHeader} containerStyle={{ flex: 2 }} />
            <Text style={[styles.columnHeader, { flex: 1.5 }]}>DEPT</Text>
            <SortableHeaderCell label="BASE" active={sortKey === "base_salary"} direction={sortDir} onPress={() => toggleSort("base_salary")} textStyle={styles.columnHeader} containerStyle={{ flex: 1 }} />
            <Text style={[styles.columnHeader, { flex: 1.5 }]}>P / H / A / OT</Text>
            <SortableHeaderCell label="WORKED" active={sortKey === "total_days_worked"} direction={sortDir} onPress={() => toggleSort("total_days_worked")} textStyle={styles.columnHeader} containerStyle={{ flex: 1 }} />
            <Text style={[styles.columnHeader, { flex: 1 }]}>OT HRS</Text>
            <SortableHeaderCell label="PAYOUT" active={sortKey === "total_payable"} direction={sortDir} onPress={() => toggleSort("total_payable")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, justifyContent: 'flex-end' }} />
          </View>

          {loading ? (
             <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
          ) : payrollData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No employees yet.</Text>
            </View>
          ) : (
            sortedPayroll.map((record) => (
              <View key={record.user_id} style={styles.tableRow}>
                <Text style={[styles.cellText, { flex: 2, fontWeight: "600", color: "#111111" }]}>{record.worker_name}</Text>
                
                {/* Fallbacks for fields not currently in your API model */}
                <Text style={[styles.cellText, { flex: 1.5 }]}>-</Text>
                
                <Text style={[styles.cellText, { flex: 1 }]}>{formatCurrency(record.base_salary)}</Text>
                
                {/* Fallback for stats */}
                <Text style={[styles.cellText, { flex: 1.5, color: "#6B7280" }]}>-</Text>
                
                <Text style={[styles.cellText, { flex: 1 }]}>{record.total_days_worked}</Text>
                
                {/* Fallback for OT */}
                <Text style={[styles.cellText, { flex: 1 }]}>-</Text>
                
                <Text style={[styles.cellText, { flex: 1, textAlign: 'right', fontWeight: "700", color: "#111111" }]}>
                  {formatCurrency(record.total_payable)}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { flexGrow: 1, padding: spacing.xl },
  
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

  // --- Summary Card ---
  summaryCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderRadius: 16, paddingVertical: 16, paddingHorizontal: spacing.xl, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.lg, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  summaryLeft: { flexDirection: "row", alignItems: "center" },
  summaryLabel: { fontSize: 15, fontWeight: "500", color: "#111111", marginRight: spacing.md },
  datePickerWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  datePickerText: { fontSize: 14, color: "#111111", marginHorizontal: 12, minWidth: 80, textAlign: "center" },
  
  summaryRight: { flexDirection: "row", alignItems: "center" },
  totalPayoutLabel: { fontSize: 15, color: "#4B5563" },
  totalPayoutValue: { fontSize: 20, fontWeight: "900", color: "#111111" },

  // --- Table ---
  tableCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 300 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyStateText: { fontSize: 15, color: "#6B7280" },
});