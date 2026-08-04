import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import ProductionService, { ProductionPlan } from "@/services/productionService";
import AppButton from "@/components/common/AppButton";
import useAuthStore from "@/store/authStore";
import { clearSession } from "@/utils/storage";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function FloorWorkerDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyWork();
  }, []);

  async function fetchMyWork() {
    try {
      // In a real scenario, the backend or this call should filter by the user's specific department.
      // For now, we fetch today's active production plans.
      const today = new Date().toISOString().split("T")[0];
      const data = await ProductionService.getPlans(today);
      setPlans(data);
    } catch (error) {
      console.log("Error fetching my work", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await clearSession();
    logout();
    router.replace("/(auth)/login");
  };

  const renderTask = ({ item }: { item: ProductionPlan }) => (
    <View style={[styles.taskCard, item.priority === "Urgent" && styles.urgentTask]}>
      <View style={styles.taskHeader}>
        <Text style={styles.productName}>{item.product_name}</Text>
        {item.priority === "Urgent" && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>
      <Text style={styles.code}>{item.internal_code}</Text>

      <View style={styles.progressRow}>
        <View style={styles.progressCol}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.targetValue}>{item.target_quantity}</Text>
        </View>
        <View style={styles.progressCol}>
          <Text style={styles.label}>Completed</Text>
          <Text style={styles.completedValue}>{item.completed_quantity}</Text>
        </View>
        <View style={styles.progressCol}>
          <Text style={styles.label}>Pending</Text>
          <Text style={styles.pendingValue}>
            {Math.max(0, item.target_quantity - item.completed_quantity)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Block */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTop}>
          <Text style={styles.greeting}>My Work</Text>
          <Pressable onPress={handleSignOut} style={styles.logoutBtn}>
            <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor={colors.white} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Today's Production Targets
        </Text>
      </View>

      {/* Quick Action */}
      <View style={styles.actionContainer}>
        <AppButton 
          title="Scan QR to Move Material" 
          onPress={() => router.push("/(protected)/floor-worker/scan")} 
        />
      </View>

      {/* Task List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : plans.length === 0 ? (
        <View style={styles.emptyState}>
          <SymbolView name="checkmark.seal.fill" size={64} tintColor={colors.border} />
          <Text style={styles.emptyText}>No tasks assigned for today.</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.plan_id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  headerBlock: {
    backgroundColor: colors.navy,
    padding: spacing.xl,
    paddingTop: 60, // Padding for status bar
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 32, fontWeight: "800", color: colors.white },
  logoutBtn: { padding: spacing.sm, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8 },
  subtitle: { fontSize: 16, color: colors.border, marginTop: spacing.xs },

  actionContainer: { padding: spacing.lg, marginTop: -20 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.secondary, marginTop: spacing.md, fontSize: 16, fontWeight: "600" },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  taskCard: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  urgentTask: { borderColor: colors.error, borderWidth: 2 },
  
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productName: { fontSize: 18, fontWeight: "800", color: colors.navy, flex: 1 },
  urgentBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  urgentText: { fontSize: 10, fontWeight: "800", color: colors.error },
  
  code: { fontSize: 13, color: colors.secondary, marginTop: 2, marginBottom: spacing.md },
  
  progressRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.background },
  progressCol: { alignItems: "center" },
  label: { fontSize: 11, fontWeight: "600", color: colors.secondary, marginBottom: 4, textTransform: "uppercase" },
  targetValue: { fontSize: 20, fontWeight: "800", color: colors.navy },
  completedValue: { fontSize: 20, fontWeight: "800", color: colors.success },
  pendingValue: { fontSize: 20, fontWeight: "800", color: colors.error },
});