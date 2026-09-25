import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Modal, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";

interface PermissionRow { id: number; name: string; description: string | null; role_count: number; }

export default function PermissionsScreen() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const search = useSearch(permissions, (p) => `${p.name} ${p.description || ""}`);
  const pagination = usePagination(search.filtered);

  useEffect(() => { fetchPermissions(); }, []);

  const fetchPermissions = async () => {
    try {
      const res = await api.get("/admin/permissions");
      setPermissions(res.data?.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch permissions.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName(""); setDescription("");
    setFormVisible(true);
  };

  const openEdit = (perm: PermissionRow) => {
    setEditing(perm);
    setName(perm.name); setDescription(perm.description || "");
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (editing) {
      try {
        setSubmitting(true);
        await api.put(`/admin/permissions/${editing.id}`, { description: description.trim() || undefined });
        setFormVisible(false);
        fetchPermissions();
      } catch (error: any) {
        Alert.alert("Error", error.response?.data?.message || "Failed to save permission.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing name", "Give the permission a name, e.g. manage_something.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/admin/permissions", { name: name.trim(), description: description.trim() || undefined });
      setFormVisible(false);
      fetchPermissions();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to create permission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (perm: PermissionRow) => {
    if (perm.name === "*") {
      Alert.alert("Can't delete this one", "The '*' Admin wildcard can't be removed.");
      return;
    }
    Alert.alert("Delete permission", `Remove "${perm.name}"? This fails if any role or module still uses it.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/admin/permissions/${perm.id}`);
            setPermissions((prev) => prev.filter((p) => p.id !== perm.id));
          } catch (error: any) {
            Alert.alert("Can't delete", error.response?.data?.message || "Failed to delete permission.");
          }
        }
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerHint}>
          Permissions are the building blocks roles are made of — like an IAM policy. Create one here, then attach it
          to a role under Roles &amp; Permissions, or use it to gate a route under Modules.
        </Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add permission</Text>
        </Pressable>
      </View>

      <SearchBar value={search.query} onChangeText={search.setQuery} placeholder="Search permissions..." resultCount={search.filtered.length} totalCount={permissions.length} />

      <FlatList
        data={pagination.pageRows}
        ListFooterComponent={<Pagination {...pagination} />}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No permissions yet.</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.name === "*" && (
                  <View style={styles.wildcardBadge}><Text style={styles.wildcardBadgeText}>ADMIN WILDCARD</Text></View>
                )}
              </View>
              {!!item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
              <Text style={styles.meta}>{item.role_count} role{item.role_count === 1 ? "" : "s"} use this</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable onPress={() => openEdit(item)} hitSlop={10}>
                <Feather name="edit-2" size={16} color="#6B7280" />
              </Pressable>
              {item.name !== "*" && (
                <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </Pressable>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.formOverlay} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.formCard} onPress={() => {}}>
            <Text style={styles.formTitle}>{editing ? `Edit "${editing.name}"` : "Add permission"}</Text>

            {!editing && (
              <>
                <Text style={styles.fieldLabel}>Name (can't be changed later)</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(t) => setName(t.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  placeholder="manage_something"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="What can someone with this permission do?" placeholderTextColor="#9CA3AF" />

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setFormVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={handleSave} disabled={submitting}>
                <Text style={styles.saveBtnText}>{submitting ? "Saving..." : editing ? "Save" : "Create"}</Text>
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
  emptyText: { fontSize: 14, color: "#9CA3AF" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 },
  headerHint: { flex: 1, fontSize: 13, color: "#6B7280", lineHeight: 18 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  listContent: { paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "700", color: "#111111", fontFamily: "monospace" },
  description: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  meta: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  wildcardBadge: { backgroundColor: "#FEF3C7", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  wildcardBadgeText: { fontSize: 9, fontWeight: "800", color: "#92400E" },

  formOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  formCard: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },

  formActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#111111", alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
