import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import api from "@/services/api";
import useAuthStore from "@/store/authStore";
import { saveSession } from "@/utils/storage";
import { getRouteForRole } from "@/utils/roleRouting";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

export default function PendingApprovalScreen() {
  const { jwt, login, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleLogout = () => {
    if (logout) logout();
    router.replace("/(auth)/login");
  };

  // Re-checks approval status using the JWT already issued at first login —
  // deliberately does NOT re-run Firebase phone verification, since
  // repeated OTP sends for the same number risk Firebase rate-limiting it.
  const onRefresh = async () => {
    setRefreshing(true);
    setStatusMessage("");
    try {
      const res = await api.get("/auth/me");
      const u = res.data.user;
      const role = u.role;

      if (role && role.toUpperCase() !== "PENDING") {
        const mappedUser = {
          id: u.id,
          phone: u.phone_number,
          name: u.full_name,
          role: u.role,
          department_id: u.department_id,
          modules: u.modules,
        };
        if (jwt) {
          await saveSession(jwt, mappedUser);
          login(mappedUser, jwt);
        }
        router.replace(getRouteForRole(role) as any);
      } else {
        setStatusMessage("Still pending — check back later.");
      }
    } catch (e) {
      setStatusMessage("Couldn't check your status. Pull down to try again.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.iconWrapper}>
        <Feather name="clock" size={32} color="#8B5CF6" />
      </View>
      <Text style={styles.title}>Awaiting Approval</Text>
      <Text style={styles.subtitle}>
        Your account has been created but doesn't have access yet. Ask an
        admin to assign your role and department, then pull down to refresh.
      </Text>

      {!!statusMessage && <Text style={styles.statusMessage}>{statusMessage}</Text>}

      <Pressable style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
        <Feather name="refresh-cw" size={16} color={colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>{refreshing ? "Checking..." : "Check Again"}</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    marginBottom: spacing.lg,
  },
  statusMessage: {
    fontSize: 14,
    color: "#8B5CF6",
    textAlign: "center",
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
});
