import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Switch, ActivityIndicator, Pressable, Modal, TextInput, Image, ScrollView } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import api from "@/services/api";
import AdminService from "@/services/adminService";

interface AppModule {
  id: number;
  name: string;
  description: string;
  icon: string;
  icon_image_url: string | null;
  is_active: boolean;
  route: string;
  permission_id: number;
  permission_name: string | null;
}
interface Permission { id: number; name: string; description: string | null; }
interface NavRoute { id: number; path: string; label: string; }

// A curated set covering most of what a module in this app would need —
// tap to pick, no need to know Feather's naming.
const ICON_CHOICES = [
  "grid", "box", "layers", "list", "database", "clipboard", "archive", "package",
  "users", "user", "user-check", "shield", "lock", "key", "settings", "sliders",
  "truck", "shopping-cart", "send", "download", "upload", "printer", "maximize",
  "check-circle", "alert-triangle", "x-circle", "info", "eye", "search",
  "file-text", "folder", "clock", "calendar", "bar-chart-2", "monitor", "activity",
  "message-circle", "bell", "credit-card", "target", "toggle-right", "tag",
  "cpu", "tool", "zap", "droplet", "star", "home", "map", "compass",
];

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

// The exact same icon-resolution logic used both in the live modules list
// and the form's live preview, so "how it'll look" is never a guess.
const ModuleIcon = ({ iconImageUrl, icon, size = 20, tint = "#8B5CF6" }: { iconImageUrl?: string | null; icon: string; size?: number; tint?: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  if (iconImageUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: iconImageUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setImageFailed(true)}
      />
    );
  }
  return <Feather name={(icon || "grid") as any} size={size} color={tint} />;
};

export default function ModulesManagementScreen() {
  const [modules, setModules] = useState<AppModule[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [routes, setRoutes] = useState<NavRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<AppModule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const [name, setName] = useState("");
  const [route, setRoute] = useState("");
  const [description, setDescription] = useState("");
  const [permissionId, setPermissionId] = useState<number | null>(null);
  const [icon, setIcon] = useState("grid");
  const [iconImageUrl, setIconImageUrl] = useState<string | null>(null);
  const [iconTab, setIconTab] = useState<"choose" | "upload">("choose");

  useEffect(() => {
    fetchModules();
    fetchPermissions();
    fetchRoutes();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await api.get("/admin/modules");
      setModules(response.data.modules);
    } catch (error) { Alert.alert("Error", "Failed to fetch app modules."); } finally { setLoading(false); }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get("/admin/permissions");
      setPermissions(res.data?.data || []);
    } catch (error) {
      console.warn("Failed to fetch permissions", error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await api.get("/admin/nav-routes");
      setRoutes(res.data?.data || []);
    } catch (error) {
      console.warn("Failed to fetch routes", error);
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
    setName(""); setRoute(""); setDescription(""); setPermissionId(null);
    setIcon("grid"); setIconImageUrl(null); setIconTab("choose");
  };

  const openCreate = () => { setEditing(null); resetForm(); setFormVisible(true); };

  const openEdit = (mod: AppModule) => {
    setEditing(mod);
    setName(mod.name);
    setRoute(mod.route);
    setDescription(mod.description || "");
    setPermissionId(mod.permission_id);
    setIcon(mod.icon || "grid");
    setIconImageUrl(mod.icon_image_url || null);
    setIconTab(mod.icon_image_url ? "upload" : "choose");
    setFormVisible(true);
  };

  const handlePickIconImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.mimeType && asset.mimeType !== "image/png" && !asset.name?.toLowerCase().endsWith(".png")) {
        Alert.alert("PNG only", "Please choose a .png file.");
        return;
      }
      setUploadingIcon(true);
      const url = await AdminService.uploadModuleIcon({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        file: (asset as any).file,
      });
      setIconImageUrl(url);
    } catch (error: any) {
      Alert.alert("Upload failed", error.message || "Could not upload that image.");
    } finally {
      setUploadingIcon(false);
    }
  };

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

  const handleSave = async () => {
    if (!name.trim() || !route.trim() || !permissionId) {
      Alert.alert("Missing fields", "Name, route, and permission are all required.");
      return;
    }
    const payload = {
      name: name.trim(),
      route: route.trim(),
      icon: icon.trim() || "grid",
      icon_image_url: iconTab === "upload" ? iconImageUrl : null,
      description: description.trim() || undefined,
      permission_id: permissionId,
    };
    try {
      setSubmitting(true);
      if (editing) {
        await api.put(`/admin/modules/${editing.id}`, payload);
      } else {
        await api.post("/admin/modules", payload);
      }
      setFormVisible(false);
      fetchModules();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save module.");
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
                <ModuleIcon iconImageUrl={item.icon_image_url} icon={item.icon} tint={item.is_active ? "#8B5CF6" : "#9CA3AF"} />
              </View>
              <View style={styles.textWrapper}>
                <Text style={[styles.name, !item.is_active && styles.textDisabled]}>{item.name}</Text>
                <Text style={[styles.description, !item.is_active && styles.textDisabled]} numberOfLines={1}>
                  {routes.find((r) => r.path === item.route)?.label || item.route} · requires {item.permission_name || "?"}
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
              <Pressable onPress={() => openEdit(item)} hitSlop={10}>
                <Feather name="edit-2" size={18} color="#6B7280" />
              </Pressable>
              <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
                <Feather name="trash-2" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.formOverlay} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.formCard} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formTitle}>{editing ? "Edit module" : "Add module"}</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Items & Recipes" placeholderTextColor="#9CA3AF" />

              <Text style={styles.label}>Route</Text>
              <SelectInput
                placeholder="Select a route..."
                value={route}
                options={routes}
                onSelect={(id: number) => setRoute(routes.find((r) => r.id === id)?.path || "")}
                getLabel={(r: NavRoute) => r.label}
              />
              {routes.length === 0 && (
                <Text style={styles.helperText}>No routes labeled yet — add one under Admin → Routes first.</Text>
              )}

              <Text style={styles.label}>Requires permission</Text>
              <SelectInput
                placeholder="Select a permission..."
                value={permissionId}
                options={permissions}
                onSelect={setPermissionId}
                getLabel={(p: Permission) => p.name}
              />

              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconTabRow}>
                <Pressable style={[styles.iconTab, iconTab === "choose" && styles.iconTabActive]} onPress={() => setIconTab("choose")}>
                  <Text style={[styles.iconTabText, iconTab === "choose" && styles.iconTabTextActive]}>Choose icon</Text>
                </Pressable>
                <Pressable style={[styles.iconTab, iconTab === "upload" && styles.iconTabActive]} onPress={() => setIconTab("upload")}>
                  <Text style={[styles.iconTabText, iconTab === "upload" && styles.iconTabTextActive]}>Upload PNG</Text>
                </Pressable>
              </View>

              <View style={styles.previewRow}>
                <View style={styles.previewBox}>
                  <ModuleIcon iconImageUrl={iconTab === "upload" ? iconImageUrl : null} icon={icon} size={28} />
                </View>
                <Text style={styles.previewLabel}>This is how it'll look</Text>
              </View>

              {iconTab === "choose" ? (
                <View style={styles.iconGrid}>
                  {ICON_CHOICES.map((name) => (
                    <Pressable
                      key={name}
                      style={[styles.iconCell, icon === name && styles.iconCellSelected]}
                      onPress={() => setIcon(name)}
                    >
                      <Feather name={name as any} size={20} color={icon === name ? "#FFFFFF" : "#374151"} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View>
                  <Pressable style={styles.uploadBtn} onPress={handlePickIconImage} disabled={uploadingIcon}>
                    {uploadingIcon ? (
                      <ActivityIndicator size="small" color="#6B7280" />
                    ) : (
                      <>
                        <Feather name="upload" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                        <Text style={styles.uploadBtnText}>{iconImageUrl ? "Replace PNG" : "Upload a PNG"}</Text>
                      </>
                    )}
                  </Pressable>
                  <Text style={styles.helperText}>
                    Fallback icon (used if the image above fails to load, or before you upload one):
                  </Text>
                  <View style={styles.iconGrid}>
                    {ICON_CHOICES.slice(0, 24).map((name) => (
                      <Pressable
                        key={name}
                        style={[styles.iconCell, icon === name && styles.iconCellSelected]}
                        onPress={() => setIcon(name)}
                      >
                        <Feather name={name as any} size={20} color={icon === name ? "#FFFFFF" : "#374151"} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Shown as a subtitle" placeholderTextColor="#9CA3AF" />

              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setFormVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={handleSave} disabled={submitting}>
                  <Text style={styles.saveBtnText}>{submitting ? "Saving..." : editing ? "Save" : "Create"}</Text>
                </Pressable>
              </View>
            </ScrollView>
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
  formCard: { width: "100%", maxWidth: 460, maxHeight: "85%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 12 },
  helperText: { fontSize: 11, color: "#9CA3AF", marginTop: 6, marginBottom: 4 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44 },
  selectText: { fontSize: 14, color: "#111111", flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 380, maxHeight: "60%", backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" },
  dropdownOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },

  iconTabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  iconTab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center" },
  iconTabActive: { backgroundColor: "#111111" },
  iconTabText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  iconTabTextActive: { color: "#FFFFFF" },

  previewRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  previewBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  previewLabel: { fontSize: 12, color: "#9CA3AF" },

  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconCell: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  iconCellSelected: { backgroundColor: "#8B5CF6" },

  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed", borderRadius: 10, paddingVertical: 14, marginBottom: 4 },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  formActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#111111", alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
