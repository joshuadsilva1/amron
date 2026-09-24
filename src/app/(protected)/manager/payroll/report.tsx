import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SymbolView } from "expo-symbols";

import PayrollService, { PayrollSummary } from "@/services/payrollService";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function PayrollReportScreen() {
  const [report, setReport] = useState<PayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    try {
      const data = await PayrollService.getPayrollReport(currentMonth);
      setReport(data || []);
    } catch (error) {
      console.log("Error fetching payroll summary", error);
    } finally {
      setLoading(false);
    }
  }

  const renderSummary = ({ item }: { item: PayrollSummary }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.workerName}>{item.worker_name}</Text>
        <Text style={styles.daysWorked}>{item.total_days_worked} Days Worked</Text>
      </View>

      <View style={styles.financialRow}>
        <View>
          <Text style={styles.label}>Base Salary</Text>
          <Text style={styles.value}>₹{item.base_salary}</Text>
        </View>
        <View>
          <Text style={styles.label}>Bonus</Text>
          <Text style={styles.value}>₹{item.bonus}</Text>
        </View>
        <View>
          <Text style={styles.label}>Total Payable</Text>
          <Text style={[styles.value, { color: colors.primary }]}>₹{item.total_payable}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payroll Ledger ({currentMonth})</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : report.length === 0 ? (
        <View style={styles.emptyState}>
          <SymbolView name="doc.text" size={48} tintColor={colors.border} />
          <Text style={styles.emptyText}>No payroll data available for this month.</Text>
        </View>
      ) : (
        <FlatList
          data={report}
          keyExtractor={(item) => item.user_id}
          renderItem={renderSummary}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.secondary, marginTop: spacing.md, fontSize: 16 },

  listContent: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  workerName: { fontSize: 18, fontWeight: "800", color: colors.navy },
  daysWorked: { fontSize: 13, fontWeight: "600", color: colors.secondary },

  financialRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.background },
  label: { fontSize: 11, fontWeight: "600", color: colors.secondary, marginBottom: 4, textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: "700", color: colors.navy },
});