import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Alert from "@/utils/alert";
import QRCode from "react-native-qrcode-svg"; // Run: npx expo install react-native-qrcode-svg react-native-svg

import AppTextInput from "@/components/common/AppTextInput";
import AppButton from "@/components/common/AppButton";
import TransactionService from "@/services/transactionService";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function GenerateQRScreen() {
  const [itemId, setItemId] = useState(""); // Replace with a dropdown in production
  const [departmentId, setDepartmentId] = useState(""); // Replace with a dropdown
  const [quantity, setQuantity] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!itemId || !departmentId || !quantity) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await TransactionService.generateQRCode({
        item_id: itemId,
        department_id: departmentId,
        quantity: parseFloat(quantity),
      });
      
      setGeneratedQR(response.qr_code_string);
      Alert.alert("Success", response.message);
      
    } catch (error: any) {
      Alert.alert("Failed to generate QR", error?.message || "Check department stock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mint New Bin</Text>

      {!generatedQR ? (
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item ID</Text>
            <AppTextInput value={itemId} onChangeText={setItemId} placeholder="Enter Product UUID" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department ID</Text>
            <AppTextInput value={departmentId} onChangeText={setDepartmentId} placeholder="Enter Dept UUID" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity in Bin</Text>
            <AppTextInput 
              value={quantity} 
              onChangeText={setQuantity} 
              placeholder="e.g. 50" 
              keyboardType="numeric" 
            />
          </View>

          <AppButton title="Generate Barcode" onPress={handleGenerate} loading={loading} />
        </View>
      ) : (
        <View style={styles.qrCard}>
          <Text style={styles.successTitle}>Bin Registered!</Text>
          <View style={styles.qrWrapper}>
            {/* Renders the actual scannable QR code on the phone screen */}
            <QRCode value={generatedQR} size={200} /> 
          </View>
          <Text style={styles.qrText}>{generatedQR}</Text>
          
          <AppButton 
            title="Mint Another Bin" 
            onPress={() => { setGeneratedQR(null); setQuantity(""); }} 
            style={{ marginTop: spacing.xl }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy, marginBottom: spacing.lg },
  
  formCard: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.secondary, marginBottom: 6 },
  
  qrCard: { backgroundColor: colors.white, padding: spacing.xl, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  successTitle: { fontSize: typography.h3, fontWeight: "700", color: colors.success, marginBottom: spacing.xl },
  qrWrapper: { padding: 20, backgroundColor: colors.white, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  qrText: { fontSize: 16, fontWeight: "700", color: colors.navy, marginTop: spacing.lg, letterSpacing: 1 },
});