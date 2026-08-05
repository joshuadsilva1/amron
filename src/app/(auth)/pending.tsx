import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import useAuthStore from "@/store/authStore";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

export default function PendingApprovalScreen() {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    if (logout) logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Feather name="clock" size={32} color="#8B5CF6" />
      </View>
      <Text style={styles.title}>Awaiting Approval</Text>
      <Text style={styles.subtitle}>
        Your account has been created but doesn't have access yet. Ask an
        admin to assign your role and department, then log in again.
      </Text>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
