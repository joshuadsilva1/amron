import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import Alert from "@/utils/alert";
import { router } from "expo-router";

import AppTextInput from "@/components/common/AppTextInput";
import AppButton from "@/components/common/AppButton";
import ProductionService from "@/services/productionService";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function NewAllocationScreen() {
  const [productId, setProductId] = React.useState("");
  const [departmentName, setDepartmentName] = React.useState("");
  const [targetQuantity, setTargetQuantity] = React.useState("");
  const [productionDate, setProductionDate] = React.useState(
    new Date().toISOString().split("T")[0] // Defaults to YYYY-MM-DD
  );
  const [isUrgent, setIsUrgent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!productId || !departmentName || !targetQuantity || !productionDate) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      await ProductionService.createPlan({
        product_id: productId,
        department_name: departmentName,
        target_quantity: parseInt(targetQuantity, 10),
        production_date: productionDate,
        priority: isUrgent ? "Urgent" : "Normal",
      });

      Alert.alert("Success", "Production allocated successfully.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to allocate production.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Allocate Production</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <AppTextInput
          value={productionDate}
          onChangeText={setProductionDate}
          placeholder="2026-07-17"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Product ID (Internal SKU)</Text>
        <AppTextInput
          value={productId}
          onChangeText={setProductId}
          placeholder="Enter Product UUID"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Department</Text>
        <AppTextInput
          value={departmentName}
          onChangeText={setDepartmentName}
          placeholder="e.g., Moulding, Brasspart, Fitting"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Target Quantity</Text>
        <AppTextInput
          value={targetQuantity}
          onChangeText={(text) => setTargetQuantity(text.replace(/\D/g, ""))}
          placeholder="e.g., 5000"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Mark as Urgent</Text>
        <Switch
          value={isUrgent}
          onValueChange={setIsUrgent}
          trackColor={{ false: colors.border, true: colors.error }}
        />
      </View>

      <View style={styles.footer}>
        <AppButton title="Confirm Allocation" onPress={handleSubmit} loading={loading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy, marginBottom: spacing.xl },
  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: typography.small, fontWeight: "600", color: colors.secondary, marginBottom: spacing.sm },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  footer: { marginTop: spacing.xxl },
});