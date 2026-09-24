import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";

interface Department { id: string; name: string; department_code: number; level: number; }
interface Level { id: number; name: string; rank: number; is_final: boolean; }

export default function DepartmentsManagementScreen() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const search = useSearch(departments);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Department Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Department — custom in-app confirm (not Alert/window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manage Levels Modal State
  const [levelsModalVisible, setLevelsModalVisible] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelRank, setNewLevelRank] = useState("");
  const [addingLevel, setAddingLevel] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
  const [levelDraftName, setLevelDraftName] = useState("");
  const [levelDraftRank, setLevelDraftRank] = useState("");
  const [savingLevelId, setSavingLevelId] = useState<number | null>(null);
  const [deleteLevelTarget, setDeleteLevelTarget] = useState<Level | null>(null);
  const [deletingLevelId, setDeletingLevelId] = useState<number | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [deptRes, levelRes] = await Promise.all([
        api.get("/departments"),
        api.get("/departments/levels"),
      ]);
      setDepartments(deptRes.data?.data || deptRes.data || []);
      setLevels(levelRes.data?.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch departments.");
    } finally {
      setLoading(false);
    }
  };

  // --- Add / Edit Department ---
  const openAddModal = () => {
    setEditingDept(null);
    setNewName("");
    setNewCode("");
    setSelectedLevel(levels[0]?.rank ?? 0);
    setModalVisible(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setNewName(dept.name);
    setNewCode(String(dept.department_code ?? ""));
    setSelectedLevel(dept.level);
    setModalVisible(true);
  };

  const handleSaveDepartment = async () => {
    if (!newName.trim()) {
      Alert.alert("Invalid Input", "Department name is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        name: newName.trim(),
        department_level: selectedLevel,
      };
      if (newCode.trim() !== "") {
        payload.department_code = parseInt(newCode, 10);
      }

      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        Alert.alert("Success", "Department updated successfully!");
      } else {
        await api.post("/departments", payload);
        Alert.alert("Success", "Department created successfully!");
      }

      setModalVisible(false);
      await fetchAll();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Department ---
  const confirmDeleteDepartment = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/departments/${deleteTarget.id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to delete department.");
    } finally {
      setDeletingId(null);
    }
  };

  // --- Levels ---
  const handleAddLevel = async () => {
    if (!newLevelName.trim() || newLevelRank.trim() === "") {
      Alert.alert("Invalid Input", "Level name and rank are both required.");
      return;
    }
    try {
      setAddingLevel(true);
      await api.post("/departments/levels", { name: newLevelName.trim(), rank: parseInt(newLevelRank, 10) });
      setNewLevelName("");
      setNewLevelRank("");
      await fetchAll();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to add level.");
    } finally {
      setAddingLevel(false);
    }
  };

  const startEditLevel = (level: Level) => {
    setEditingLevelId(level.id);
    setLevelDraftName(level.name);
    setLevelDraftRank(String(level.rank));
  };

  const handleSaveLevel = async (levelId: number) => {
    if (!levelDraftName.trim() || levelDraftRank.trim() === "") {
      Alert.alert("Invalid Input", "Level name and rank are both required.");
      return;
    }
    try {
      setSavingLevelId(levelId);
      await api.put(`/departments/levels/${levelId}`, {
        name: levelDraftName.trim(),
        rank: parseInt(levelDraftRank, 10),
      });
      setEditingLevelId(null);
      await fetchAll();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to update level.");
    } finally {
      setSavingLevelId(null);
    }
  };

  const confirmDeleteLevel = async () => {
    if (!deleteLevelTarget) return;
    try {
      setDeletingLevelId(deleteLevelTarget.id);
      await api.delete(`/departments/levels/${deleteLevelTarget.id}`);
      setDeleteLevelTarget(null);
      await fetchAll();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to delete level.");
    } finally {
      setDeletingLevelId(null);
    }
  };

  const getLevelName = (levelInt: number) => {
    const level = levels.find(l => l.rank === levelInt);
    return level ? level.name : `Layer ${levelInt}`;
  };

  if (loading && departments.length === 0) return <View style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <Pressable style={styles.secondaryButton} onPress={() => setLevelsModalVisible(true)}>
          <Feather name="layers" size={18} color="#8B5CF6" />
          <Text style={styles.secondaryButtonText}>Manage Levels</Text>
        </Pressable>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Department</Text>
        </Pressable>
      </View>

      <SearchBar
        value={search.query}
        onChangeText={search.setQuery}
        placeholder="Search departments..."
        resultCount={search.filtered.length}
        totalCount={departments.length}
        style={{ marginTop: 4 }}
      />
      <FlatList
        data={search.filtered}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="git-commit" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Departments Yet</Text>
            <Text style={styles.emptyStateText}>Click the button above to add your first factory department.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable style={styles.deptInfo} onPress={() => openEditModal(item)}>
              <View style={styles.iconWrapper}>
                <Feather name="git-commit" size={20} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subtext}>Code: {item.department_code}  •  Level: {getLevelName(item.level)}</Text>
              </View>
            </Pressable>
            <View style={styles.cardActions}>
              <Pressable hitSlop={8} onPress={() => openEditModal(item)}>
                <Feather name="edit-2" size={18} color="#6B7280" />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setDeleteTarget(item)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Feather name="trash-2" size={18} color="#EF4444" />
                )}
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Add / Edit Department Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingDept ? "Edit Department" : "Add Department"}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Department Name*</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Laser Cutting"
                placeholderTextColor="#9CA3AF"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dept Code (Optional - Auto-generates)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank for next available code"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={newCode}
                onChangeText={setNewCode}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hierarchy Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
                {levels.map((lvl) => (
                  <Pressable
                    key={lvl.id}
                    style={[styles.pill, selectedLevel === lvl.rank && styles.pillActive]}
                    onPress={() => setSelectedLevel(lvl.rank)}
                  >
                    <Text style={[styles.pillText, selectedLevel === lvl.rank && styles.pillTextActive]}>
                      {lvl.name}{lvl.is_final ? " (Final)" : ""}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {levels.length === 0 && (
                <Text style={styles.helperText}>No levels configured — tap "Manage Levels" first.</Text>
              )}
            </View>

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSaveDepartment}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{editingDept ? "Save Changes" : "Create Department"}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Department Confirm Modal */}
      <Modal visible={!!deleteTarget} animationType="fade" transparent={true}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrapper}>
              <Feather name="alert-triangle" size={24} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Department</Text>
            <Text style={styles.confirmMessage}>
              Delete "{deleteTarget?.name}"? This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setDeleteTarget(null)} disabled={!!deletingId}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteBtn} onPress={confirmDeleteDepartment} disabled={!!deletingId}>
                {deletingId ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Levels Modal */}
      <Modal visible={levelsModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Hierarchy Levels</Text>
              <Pressable onPress={() => setLevelsModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>
            <Text style={styles.levelsHelper}>
              Ordered low to high. The highest-ranked level is treated as "final" (finished goods / dispatch).
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {[...levels].sort((a, b) => a.rank - b.rank).map((level) => (
                <View key={level.id} style={styles.levelRow}>
                  {editingLevelId === level.id ? (
                    <>
                      <TextInput
                        style={[styles.levelInput, { flex: 2 }]}
                        value={levelDraftName}
                        onChangeText={setLevelDraftName}
                        placeholder="Level name"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TextInput
                        style={[styles.levelInput, { width: 60 }]}
                        value={levelDraftRank}
                        onChangeText={setLevelDraftRank}
                        keyboardType="numeric"
                        placeholder="Rank"
                        placeholderTextColor="#9CA3AF"
                      />
                      {savingLevelId === level.id ? (
                        <ActivityIndicator size="small" color="#8B5CF6" />
                      ) : (
                        <Pressable style={styles.levelSaveBtn} onPress={() => handleSaveLevel(level.id)}>
                          <Feather name="check" size={16} color="#FFFFFF" />
                        </Pressable>
                      )}
                      <Pressable hitSlop={8} onPress={() => setEditingLevelId(null)}>
                        <Feather name="x" size={18} color="#9CA3AF" />
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.levelRank}>#{level.rank}</Text>
                        <Text style={styles.levelName}>{level.name}</Text>
                        {level.is_final && (
                          <View style={styles.finalBadge}>
                            <Text style={styles.finalBadgeText}>FINAL</Text>
                          </View>
                        )}
                      </View>
                      <Pressable hitSlop={8} onPress={() => startEditLevel(level)} style={{ marginRight: 16 }}>
                        <Feather name="edit-2" size={16} color="#6B7280" />
                      </Pressable>
                      <Pressable
                        hitSlop={8}
                        onPress={() => setDeleteLevelTarget(level)}
                        disabled={deletingLevelId === level.id}
                      >
                        {deletingLevelId === level.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Feather name="trash-2" size={16} color="#EF4444" />
                        )}
                      </Pressable>
                    </>
                  )}
                </View>
              ))}
              {levels.length === 0 && (
                <Text style={styles.helperText}>No levels yet — add your first one below.</Text>
              )}
            </ScrollView>

            <View style={styles.addLevelRow}>
              <TextInput
                style={[styles.levelInput, { flex: 2 }]}
                value={newLevelName}
                onChangeText={setNewLevelName}
                placeholder="e.g. High-Mid"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.levelInput, { width: 60 }]}
                value={newLevelRank}
                onChangeText={setNewLevelRank}
                keyboardType="numeric"
                placeholder="Rank"
                placeholderTextColor="#9CA3AF"
              />
              <Pressable style={styles.levelSaveBtn} onPress={handleAddLevel} disabled={addingLevel}>
                {addingLevel ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="plus" size={16} color="#FFFFFF" />}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Level Confirm Modal */}
      <Modal visible={!!deleteLevelTarget} animationType="fade" transparent={true}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrapper}>
              <Feather name="alert-triangle" size={24} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Level</Text>
            <Text style={styles.confirmMessage}>
              Delete "{deleteLevelTarget?.name}"? Departments already on this level will block the delete.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setDeleteLevelTarget(null)} disabled={!!deletingLevelId}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmDeleteBtn} onPress={confirmDeleteLevel} disabled={!!deletingLevelId}>
                {deletingLevelId ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionBar: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginBottom: 16 },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  secondaryButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#EDE9FE", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#DDD6FE" },
  secondaryButtonText: { color: "#8B5CF6", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  listContent: { paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deptInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 16 },
  name: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 2 },
  subtext: { fontSize: 14, color: "#6B7280" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 40 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: Platform.OS === "ios" ? 48 : 32 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111" },
  closeIcon: { padding: 4 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, fontSize: 16, color: "#111111" },
  helperText: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },

  pillContainer: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  pill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB", marginRight: 8 },
  pillActive: { backgroundColor: "#EDE9FE", borderColor: "#8B5CF6" },
  pillText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  pillTextActive: { color: "#8B5CF6", fontWeight: "700" },

  submitButton: { backgroundColor: "#8B5CF6", padding: 18, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  // Custom delete-confirm modal (deliberately not Alert.alert / window.confirm)
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, alignItems: "center" },
  confirmIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#111111", marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#F3F4F6" },
  confirmCancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  confirmDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#EF4444" },
  confirmDeleteText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  // Levels management
  levelsHelper: { fontSize: 13, color: "#6B7280", marginBottom: 16, lineHeight: 18 },
  levelRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 8 },
  levelRank: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", width: 32 },
  levelName: { fontSize: 15, fontWeight: "600", color: "#111111", flex: 1 },
  finalBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  finalBadgeText: { fontSize: 10, fontWeight: "800", color: "#16A34A" },
  levelInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, height: 38, paddingHorizontal: 10, fontSize: 14, color: "#111111" },
  levelSaveBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" },
  addLevelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
});
