import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";

interface User { id: string; phone: string; name: string; role_id: number; role_name: string; }
interface Role { id: number; name: string; }

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Unified Modal State for Add & Edit
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formPhone, setFormPhone] = useState("+91");
  const [formName, setFormName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data.users);
      setRoles(response.data.roles);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch users");
    } finally { setLoading(false); }
  };

  const openAddModal = () => {
    setEditingUserId(null);
    setFormPhone("+91");
    setFormName("");
    setSelectedRoleId(null);
    setModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setFormPhone(user.phone);
    setFormName(user.name);
    setSelectedRoleId(user.role_id);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formPhone || formPhone.length < 10) {
      Alert.alert("Invalid Input", "Please enter a valid phone number.");
      return;
    }
    if (!selectedRoleId) {
      Alert.alert("Required", "You must assign a role to this user.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingUserId) {
        // Edit Existing User
        await api.put(`/admin/users/${editingUserId}`, {
          phone: formPhone,
          name: formName,
          role_id: selectedRoleId
        });
        Alert.alert("Success", "User updated successfully!");
      } else {
        // Create New User
        await api.post("/admin/users", {
          phone: formPhone,
          name: formName,
          role_id: selectedRoleId
        });
        Alert.alert("Success", "User created successfully!");
      }
      
      setModalVisible(false);
      await fetchData(); 
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && users.length === 0) return <View style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add User</Text>
        </Pressable>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Feather name="user" size={20} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.name}>{item.name || "Unknown"}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
            </View>
            
            <View style={styles.actionsContainer}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role_name}</Text>
              </View>
              <Pressable style={styles.editButton} onPress={() => openEditModal(item)}>
                <Feather name="edit-2" size={18} color="#4B5563" />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingUserId ? "Edit User" : "Add New User"}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor="#9CA3AF"
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+919876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={formPhone}
                onChangeText={setFormPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assign Role</Text>
              <View style={styles.rolePillContainer}>
                {roles.map(role => (
                  <Pressable
                    key={role.id}
                    style={[styles.rolePill, selectedRoleId === role.id && styles.rolePillActive]}
                    onPress={() => setSelectedRoleId(role.id)}
                  >
                    <Text style={[styles.rolePillText, selectedRoleId === role.id && styles.rolePillTextActive]}>
                      {role.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{editingUserId ? "Save Changes" : "Create User"}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionBar: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  listContent: { paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 16 },
  name: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 2 },
  phone: { fontSize: 14, color: "#6B7280" },
  
  actionsContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  roleBadge: { backgroundColor: "#F3F4F6", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  roleText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  editButton: { padding: 8, backgroundColor: "#F9FAFB", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: Platform.OS === "ios" ? 48 : 32 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111" },
  closeIcon: { padding: 4 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, fontSize: 16, color: "#111111" },
  rolePillContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rolePill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  rolePillActive: { backgroundColor: "#EDE9FE", borderColor: "#8B5CF6" },
  rolePillText: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  rolePillTextActive: { color: "#8B5CF6", fontWeight: "700" },
  submitButton: { backgroundColor: "#8B5CF6", padding: 18, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" }
});