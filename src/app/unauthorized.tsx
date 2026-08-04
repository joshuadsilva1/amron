import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import colors from "@/theme/colors";

export default function UnauthorizedPage() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Feather name="lock" size={32} color="#EF4444" />
        </View>
        <Text style={styles.title}>Authorization Required</Text>
        <Text style={styles.subtitle}>
          Your session is missing, expired, or you do not have permission to access the factory floor management system. Please sign in with an authorized account.
        </Text>

        <Pressable style={styles.btn} onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.btnText}>Go to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#111111", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  btn: { backgroundColor: "#111111", width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: colors.white, fontSize: 15, fontWeight: "700" }
});
