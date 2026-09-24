import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Switch, ActivityIndicator, Pressable, Modal, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";
import { NAV_GROUPS_PRE, NAV_GROUPS_POST } from "@/config/navigation";

interface AppModule {
  id: number;
  name: string;
  description: string;
  icon: any;
  is_active: boolean;
  route: string;
  permission_id: number;
  permission_name: string | null;
}
interface Permission { id: number; name: string; description: string | null; }

// Every route the sidebar can link to, deduped, for the route picker — so
// an admin can't typo a route a module then silently never matches.
const KNOWN_ROUTES = Array.from(
  new Set([...NAV_GROUPS_PRE, ...NAV_GROUPS_POST].flatMap((g) => g.items.map((i) => i.route)))
).sort();

// Same modal-dropdown pattern used across the app.
const SelectInput = ({ placeholder, value, options, onSelect, getLabel }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => (o.id ?? o) === value);
  const label = selectedOption ? (getLabel ? getLabel(selectedOption) : selectedOption.name ?? selectedOption) : null;

  return (
    <View>
      <Pressable style={styles.selectBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !label && { color: "#9CA3AF" }]} numberOfLines={1}>
          {label || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <FlatList
              data={options || []}
              keyExtractor={(item: any) => String(item.id ?? item)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(item.id ?? item); setModalVisible(false); }}
                >
                  <Text style={styles.dropdownOptionText}>{getLabel ? getLabel(item) : item.name ?? item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function ModulesManagementScreen() {
  const [modules, setModules] = useState<AppModule[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [createVisible, setCreateVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [route, setRoute] = useState("");
  const [icon, setIcon] = useState("grid");
  const [description, setDescription] = useState("");
  const [permissionId, setPermissionId] = useState<number | null>(null);

  useEffect(() => {
    fetchModules();
    fetchPermissions();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get("/admin/modules");
      setModules(response.data.modules);
    } catch (error) { Alert.alert("Error", "Failed to fetch app modules."); } finally { setLoading(false); }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get("/admin/roles");
      setPermissions(response.data.all_permissions || []);
    } catch (error) {
      console.warn("Failed to fetch permissions", error);
    }
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

  const resetForm = () => {
    setName(""); setRoute(""); setIcon("grid"); setDescription(""); setPermissionId(null);
  };

  const openCreate = () => { resetForm(); setCreateVisible(true); };

  const handleDelete = (mod: AppModule) => {
    Alert.alert("Delete module", `Remove "${mod.name}"? This just stops gating that route — the screen itself isn't affected.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/admin/modules/${mod.id}`);
            setModules((prev) => prev.filter((m) => m.id !== mod.id));
          } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Failed to delete module.");
          }
        }
      },
    ]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !route.trim() || !permissionId) {
      Alert.alert("Missing fields", "Name, route, and permission are all required.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/admin/modules", {
        name: name.trim(),
        route: route.trim(),
        icon: icon.trim() || "grid",
        description: description.trim() || undefined,
        permission_id: permissionId,
      });
      setCreateVisible(false);
      fetchModules();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to create module.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && modules.length === 0) return <View style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerHint}>
          A module gates one route behind one permission. A route with no module here stays visible to everyone.
        </Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add module</Text>
        </Pressable>
      </View>

      <FlatList
        data={modules}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="toggle-left" size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No modules configured yet</Text>
            <Text style={styles.emptyText}>Tap "Add module" above to gate your first route behind a permission.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.moduleInfo}>
              <View style={[styles.iconWrapper, !item.is_active && styles.iconDisabled]}>
                <Feather name={item.icon || "grid"} size={20} color={item.is_active ? "#8B5CF6" : "#9CA3AF"} />
              </View>
              <View style={styles.textWrapper}>
                <Text style={[styles.name, !item.is_active && styles.textDisabled]}>{item.name}</Text>
                <Text style={[styles.description, !item.is_active && styles.textDisabled]} numberOfLines={1}>
                  {item.route} · requires {item.permission_name || "?"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Switch
                value={item.is_active}
                onValueChange={() => toggleModule(item.id, item.is_active)}
                trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }}
                thumbColor={"#FFFFFF"}
              />
              <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
                <Feather name="trash-2" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <Pressable style={styles.formOverlay} onPress={() => setCreateVisible(false)}>
          <Pressable style={styles.formCard} onPress={() => {}}>
            <Text style={styles.formTitle}>Add module</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Items & Recipes" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Route</Text>
            <SelectInput placeholder="Select a route..." value={route} options={KNOWN_ROUTES} onSelect={setRoute} getLabel={(r: string) => r} />

            <Text style={styles.label}>Requires permission</Text>
            <SelectInput
              placeholder="Select a permission..."
              value={permissionId}
              options={permissions}
              onSelect={setPermissionId}
              getLabel={(p: Permission) => p.name}
            />

            <Text style={styles.label}>Icon (Feather icon name, optional)</Text>
            <TextInput style={styles.input} value={icon} onChangeText={setIcon} placeholder="grid" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Shown as a subtitle" placeholderTextColor="#9CA3AF" />

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setCreateVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={handleCreate} disabled={submitting}>
                <Text style={styles.saveBtnText}>{submitting ? "Creating..." : "Create"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingTop: 80 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 },
  headerHint: { flex: 1, fontSize: 13, color: "#6B7280", lineHeight: 18 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  listContent: { paddingBottom: 40, flexGrow: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moduleInfo: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 16 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 16 },
  iconDisabled: { backgroundColor: "#F3F4F6" },
  textWrapper: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 2 },
  textDisabled: { color: "#9CA3AF" },
  description: { fontSize: 13, color: "#6B7280" },

  formOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  formCard: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44 },
  selectText: { fontSize: 14, color: "#111111", flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 380, maxHeight: "60%", backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" },
  dropdownOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },

  formActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#111111", alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
