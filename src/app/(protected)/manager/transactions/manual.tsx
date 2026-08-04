import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Alert from "@/utils/alert";
import { router } from "expo-router";

import AppTextInput from "@/components/common/AppTextInput";
import AppButton from "@/components/common/AppButton";
import TransactionService from "@/services/transactionService";
import useAuthStore from "@/store/authStore";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function ManualTransactionScreen() {
  const user = useAuthStore((s) => s.user);

  const [productId, setProductId] = useState("");
  const [departmentId, setDepartmentId] = useState(user?.department_id || "");
  const [transactionType, setTransactionType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productId || !quantity || !departmentId || !reason) {
      Alert.alert("Error", "Product ID, Department ID, Quantity, and Reason are required.");
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert("Error", "Quantity must be a valid number greater than zero.");
      return;
    }

    try {
      setLoading(true);
      await TransactionService.manualAdjustment({
        product_id: productId,
        transaction_type: transactionType,
        quantity: parsedQty,
        department_id: departmentId,
        reason,
        reference_number: referenceNumber,
        user_name: user?.name || "Admin / Manager",
      });

      Alert.alert("Success", `Manual stock ${transactionType} logged successfully.`);
      router.back();
    } catch (error: any) {
      Alert.alert("Transaction Failed", error?.message || "Could not complete manual adjustment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Manual Stock Adjustment</Text>

      {/* Transaction Type Selector */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, transactionType === "IN" && styles.toggleBtnIn]}
          onPress={() => setTransactionType("IN")}
        >
          <Text style={[styles.toggleText, transactionType === "IN" && styles.toggleTextActive]}>
            Stock IN (+)
          </Text>
        </Pressable>

        <Pressable
          style={[styles.toggleBtn, transactionType === "OUT" && styles.toggleBtnOut]}
          onPress={() => setTransactionType("OUT")}
        >
          <Text style={[styles.toggleText, transactionType === "OUT" && styles.toggleTextActive]}>
            Stock OUT (-)
          </Text>
        </Pressable>
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
        <Text style={styles.label}>Department ID</Text>
        <AppTextInput
          value={departmentId}
          onChangeText={setDepartmentId}
          placeholder="Enter Department UUID"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Quantity</Text>
        <AppTextInput
          value={quantity}
          onChangeText={(text) => setQuantity(text.replace(/\D/g, ""))}
          placeholder="e.g., 100"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Reason / Justification *</Text>
        <AppTextInput
          value={reason}
          onChangeText={setReason}
          placeholder="e.g., Physical audit correction, damaged goods"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Reference Number (Optional)</Text>
        <AppTextInput
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          placeholder="e.g., Invoice # or Audit ID"
        />
      </View>

      <View style={styles.footer}>
        <AppButton 
          title={`Confirm Stock ${transactionType}`} 
          onPress={handleSubmit} 
          loading={loading} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy, marginBottom: spacing.xl },
  
  toggleRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  toggleBtn: { flex: 1, padding: spacing.md, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  toggleBtnIn: { backgroundColor: colors.success, borderColor: colors.success },
  toggleBtnOut: { backgroundColor: colors.error, borderColor: colors.error },
  toggleText: { fontSize: 16, fontWeight: "700", color: colors.navy },
  toggleTextActive: { color: colors.white },

  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: typography.small, fontWeight: "600", color: colors.secondary, marginBottom: spacing.sm },
  footer: { marginTop: spacing.xxl, marginBottom: spacing.xxl },
});