import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

interface Permission {
  id: number;
  name: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permission_ids: number[];
}

export default function RolesAndPermissionsScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Tracks the active permission IDs for the currently selected role
  const [activePermissionIds, setActivePermissionIds] = useState<number[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      const res = await api.get("/admin/roles");
      setRoles(res.data.roles);
      setAllPermissions(res.data.all_permissions);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch roles and permissions.");
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    // Load this specific role's permission IDs into our working state
    setActivePermissionIds([...role.permission_ids]);
  };

  const togglePermission = (permissionId: number) => {
    setActivePermissionIds((prevIds) => {
      if (prevIds.includes(permissionId)) {
        // Remove it if it exists
        return prevIds.filter((id) => id !== permissionId);
      } else {
        // Add it if it doesn't
        return [...prevIds, permissionId];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    
    try {
      await api.put(`/admin/roles/${selectedRole.id}/permissions`, { 
        permission_ids: activePermissionIds 
      });
      
      // Update local state so the UI stays synced without a full reload
      setRoles((prevRoles) => 
        prevRoles.map(r => r.id === selectedRole.id ? { ...r, permission_ids: activePermissionIds } : r)
      );

      Alert.alert("Success", `${selectedRole.name} permissions updated!`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = (role: Role) => {
    Alert.alert(
      "Delete Role",
      `Delete "${role.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(role.id);
              await api.delete(`/admin/roles/${role.id}`);
              setRoles((prev) => prev.filter((r) => r.id !== role.id));
              if (selectedRole?.id === role.id) {
                setSelectedRole(null);
                setActivePermissionIds([]);
              }
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.error || "Failed to delete role.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Roles & Permissions</Text>
        <Text style={styles.subtitle}>Manage granular access controls across the entire system.</Text>
      </View>

      <View style={styles.content}>
        {/* Left Column: Roles List */}
        <View style={styles.rolesColumn}>
          <Text style={styles.columnHeader}>System Roles</Text>
          <ScrollView>
            {roles.map((role) => {
              const isActive = selectedRole?.id === role.id;
              return (
                <Pressable
                  key={role.id}
                  style={[styles.roleCard, isActive && styles.roleCardActive]}
                  onPress={() => handleSelectRole(role)}
                >
                  <View style={styles.roleCardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleName, isActive && styles.roleNameActive]}>
                        {role.name}
                      </Text>
                      {role.description && (
                        <Text style={styles.roleDesc}>{role.description}</Text>
                      )}
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleDeleteRole(role)}
                      disabled={deletingId === role.id}
                    >
                      {deletingId === role.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      )}
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Right Column: Dynamic Toggles */}
        <View style={styles.permissionsColumn}>
          {!selectedRole ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Select a role to view permissions.</Text>
            </View>
          ) : (
            <>
              <View style={styles.permissionsHeaderRow}>
                <Text style={styles.columnHeader}>Editing: {selectedRole.name}</Text>
                <Pressable 
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} 
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {allPermissions.map((perm) => {
                  const hasPermission = activePermissionIds.includes(perm.id);
                  
                  return (
                    <View key={perm.id} style={styles.permissionRow}>
                      <View style={styles.permissionTextContainer}>
                        <Text style={styles.permissionLabel}>
                          {/* Formatting database strings like 'edit_recipes' to 'Edit Recipes' */}
                          {perm.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                        <Text style={styles.permissionDesc}>{perm.description}</Text>
                      </View>
                      <Switch
                        trackColor={{ false: "#D1D5DB", true: "#A78BFA" }}
                        thumbColor={hasPermission ? "#ffffff" : "#f4f3f4"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={() => togglePermission(perm.id)}
                        value={hasPermission}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: spacing.xl },
  
  header: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  
  content: { flex: 1, flexDirection: "row", gap: spacing.xl },
  
  rolesColumn: { width: 280, backgroundColor: "#ffffff", borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: "#E5E7EB", elevation: 2 },
  columnHeader: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  roleCard: { padding: spacing.md, borderRadius: 8, marginBottom: spacing.sm, backgroundColor: "#F3F4F6" },
  roleCardRow: { flexDirection: "row", alignItems: "center" },
  roleCardActive: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#6366F1" },
  roleName: { fontSize: 15, fontWeight: "600", color: "#4B5563" },
  roleNameActive: { color: "#4338CA" },
  roleDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },

  permissionsColumn: { flex: 1, backgroundColor: "#ffffff", borderRadius: 12, padding: spacing.xl, borderWidth: 1, borderColor: "#E5E7EB", elevation: 2 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyStateText: { color: "#9CA3AF", fontSize: 16, fontStyle: "italic" },
  
  permissionsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: spacing.md },
  
  permissionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  permissionTextContainer: { flex: 1, paddingRight: spacing.xl },
  permissionLabel: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  permissionDesc: { fontSize: 13, color: "#6B7280" },
  
  saveBtn: { backgroundColor: "#111111", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
});