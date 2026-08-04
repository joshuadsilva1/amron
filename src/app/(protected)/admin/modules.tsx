import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Switch, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";

interface AppModule { id: number; name: string; description: string; icon: any; is_active: boolean; route: string; }

export default function ModulesManagementScreen() {
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchModules(); }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get("/admin/modules");
      setModules(response.data.modules);
    } catch (error) { Alert.alert("Error", "Failed to fetch app modules."); } finally { setLoading(false); }
  };

  const toggleModule = async (moduleId: number, currentStatus: boolean) => {
    setModules((prev) => prev.map((mod) => mod.id === moduleId ? { ...mod, is_active: !currentStatus } : mod));
    try {
      await api.put(`/admin/modules/${moduleId}/toggle`);
    } catch (error) {
      setModules((prev) => prev.map((mod) => mod.id === moduleId ? { ...mod, is_active: currentStatus } : mod));
      Alert.alert("Error", "Failed to toggle module status.");
    }
  };

  if (loading && modules.length === 0) return <View style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <FlatList
      data={modules}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.moduleInfo}>
            <View style={[styles.iconWrapper, !item.is_active && styles.iconDisabled]}>
              <Feather name={item.icon || "grid"} size={20} color={item.is_active ? "#8B5CF6" : "#9CA3AF"} />
            </View>
            <View style={styles.textWrapper}>
              <Text style={[styles.name, !item.is_active && styles.textDisabled]}>{item.name}</Text>
              <Text style={[styles.description, !item.is_active && styles.textDisabled]} numberOfLines={1}>{item.description}</Text>
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => toggleModule(item.id, item.is_active)}
            trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }}
            thumbColor={"#FFFFFF"}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moduleInfo: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 16 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 16 },
  iconDisabled: { backgroundColor: "#F3F4F6" }, 
  textWrapper: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 2 },
  textDisabled: { color: "#9CA3AF" },
  description: { fontSize: 14, color: "#6B7280" },
});