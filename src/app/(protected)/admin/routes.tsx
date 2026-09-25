import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Modal, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";

interface NavRoute { id: number; path: string; label: string; description: string | null; }

export default function NavRoutesScreen() {
  const [routes, setRoutes] = useState<NavRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<NavRoute | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const search = useSearch(routes, (r) => `${r.label} ${r.path} ${r.description || ""}`);
  const pagination = usePagination(search.filtered);

  useEffect(() => { fetchRoutes(); }, []);

  const fetchRoutes = async () => {
    try {
      const res = await api.get("/admin/nav-routes");
      setRoutes(res.data?.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch routes.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setPath(""); setLabel(""); setDescription("");
    setFormVisible(true);
  };

  const openEdit = (route: NavRoute) => {
    setEditing(route);
    setPath(route.path); setLabel(route.label); setDescription(route.description || "");
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (!path.trim() || !label.trim()) {
      Alert.alert("Missing fields", "Path and label are both required.");
      return;
    }
    try {
      setSubmitting(true);
      if (editing) {
        await api.put(`/admin/nav-routes/${editing.id}`, { path: path.trim(), label: label.trim(), description: description.trim() || undefined });
      } else {
        await api.post("/admin/nav-routes", { path: path.trim(), label: label.trim(), description: description.trim() || undefined });
      }
      setFormVisible(false);
      fetchRoutes();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save route.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (route: NavRoute) => {
    Alert.alert("Delete route label", `Remove the label "${route.label}"? The screen at that path is unaffected.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/admin/nav-routes/${route.id}`);
            setRoutes((prev) => prev.filter((r) => r.id !== route.id));
          } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Failed to delete route.");
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
          Give each screen a plain-language name — used wherever you pick a route elsewhere in Admin (like Modules),
          so nobody has to read a technical path to know what it points to.
        </Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add route</Text>
        </Pressable>
      </View>

      <SearchBar value={search.query} onChangeText={search.setQuery} placeholder="Search by name or path..." resultCount={search.filtered.length} totalCount={routes.length} />

      <FlatList
        data={pagination.pageRows}
        ListFooterComponent={<Pagination {...pagination} />}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No routes found.</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
              {!!item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable onPress={() => openEdit(item)} hitSlop={10}>
                <Feather name="edit-2" size={16} color="#6B7280" />
              </Pressable>
              <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
                <Feather name="trash-2" size={16} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.formOverlay} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.formCard} onPress={() => {}}>
            <Text style={styles.formTitle}>{editing ? "Edit route" : "Add route"}</Text>

            <Text style={styles.fieldLabel}>Display name</Text>
            <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Admin Page" placeholderTextColor="#9CA3AF" />

            <Text style={styles.fieldLabel}>Path</Text>
            <TextInput
              style={styles.input}
              value={path}
              onChangeText={setPath}
              placeholder="/(protected)/manager/items"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Shown as a hint" placeholderTextColor="#9CA3AF" />

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
  label: { fontSize: 15, fontWeight: "700", color: "#111111", marginBottom: 3 },
  path: { fontSize: 12, color: "#9CA3AF", fontFamily: "monospace" },
  description: { fontSize: 13, color: "#6B7280", marginTop: 4 },

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
