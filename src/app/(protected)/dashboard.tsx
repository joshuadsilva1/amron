import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import useAuthStore from "@/store/authStore";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  
  // The frontend now simply renders whatever the backend tells it to!
  // If the backend sends 2 modules, it shows 2. If 10, it shows 10.
  const dynamicModules = user?.modules || [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.name || user?.phone}</Text>
        </View>

        <View style={styles.grid}>
          {dynamicModules.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="lock" size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Access</Text>
              <Text style={styles.emptySubtitle}>You have no assigned modules.</Text>
            </View>
          ) : (
            dynamicModules.map((module: any, index: number) => (
              <Pressable 
                key={index}
                onPress={() => router.push(module.route)}
                style={styles.card}
              >
                <View style={styles.iconWrapper}>
                  {/* Dynamically renders the icon sent from the DB */}
                  <Feather name={module.icon || "grid"} size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.cardTitle}>{module.name}</Text>
                <Text style={styles.cardSubtitle}>{module.description}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6B7280" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 },
  card: { 
    width: "47%", 
    backgroundColor: colors.white, 
    padding: 20, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2
  },
  iconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: "#6B7280", lineHeight: 16 },
  emptyState: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", marginTop: 8 }
});