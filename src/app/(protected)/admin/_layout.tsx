import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView} from "react-native";
import { Slot, usePathname, router } from "expo-router";

const ADMIN_TABS = [
  { name: "Users", route: "/(protected)/admin/users" },
  { name: "Modules", route: "/(protected)/admin/modules" },
  { name: "Department", route: "/(protected)/admin/departments" },
  { name: "Routing Editor", route: "/(protected)/admin/routing" },
    { name: "Roles", route: "/(protected)/admin/roles" },
  { name: "WhatsApp", route: "/(protected)/admin/whatsapp" },
];

export default function AdminLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
  <Text style={styles.pageTitle}>Admin Control Center</Text>
  <Text style={styles.pageSubtitle}>Manage system configurations, user access, and factory layouts.</Text>

  {/* Replaced View with ScrollView */}
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.tabContainer}
    style={{ flexGrow: 0 }} // Prevents the ScrollView from expanding infinitely
  >
    {ADMIN_TABS.map((tab) => {
      const isActive = pathname.includes(tab.route.split('/').pop() || '');
      
      return (
        <Pressable
          key={tab.route}
          onPress={() => router.push(tab.route as any)}
          style={[styles.tabButton, isActive ? styles.activeTab : styles.inactiveTab]}
        >
          <Text style={[styles.tabText, isActive ? styles.activeTabText : styles.inactiveTabText]}>
            {tab.name}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
</View>

      {/* The individual pages load right here without any headers */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { padding: 32, paddingBottom: 0 },
  pageTitle: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 16, color: "#6B7280", marginTop: 6, marginBottom: 24 },
  
  tabContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  tabText: { fontSize: 15, fontWeight: "600" },

  activeTab: { backgroundColor: "#8B5CF6" },
  activeTabText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  
  inactiveTab: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  inactiveTabText: { color: "#111111", fontSize: 15, fontWeight: "500" },
  
  content: { flex: 1, paddingHorizontal: 32 },
});