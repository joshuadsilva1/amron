import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import SupplierOrderService, { Supplier } from "@/services/supplierService";

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State — same modal doubles as Add and Edit
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await SupplierOrderService.getSuppliers();
      setSuppliers(data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch suppliers.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setName(""); setPhone(""); setEmail(""); setAddress("");
    setModalVisible(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setPhone(supplier.phone || "");
    setEmail(supplier.contact_email || "");
    setAddress(supplier.address || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Invalid Input", "Supplier name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      contact_email: email.trim() || undefined,
      address: address.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      if (editingSupplier) {
        await SupplierOrderService.updateSupplier(editingSupplier.id, payload);
      } else {
        await SupplierOrderService.createSupplier(payload);
      }
      setModalVisible(false);
      await fetchSuppliers();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(
      "Delete Supplier",
      `Delete "${supplier.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(supplier.id);
              const res = await SupplierOrderService.deleteSupplier(supplier.id);
              setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
              if (res?.message) Alert.alert("Done", res.message);
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.error || "Failed to delete supplier.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Suppliers</Text>
          <Text style={styles.subtitle}>Vendors you order raw materials from.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Supplier</Text>
        </Pressable>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="truck" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Suppliers Yet</Text>
            <Text style={styles.emptyStateText}>Click the button above to add your first supplier.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEditModal(item)}>
            <View style={styles.supplierInfo}>
              <View style={styles.iconWrapper}>
                <Feather name="truck" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subtext}>
                  {[item.phone, item.contact_email].filter(Boolean).join("  •  ") || "No contact info"}
                </Text>
                {item.address && <Text style={styles.addressText}>{item.address}</Text>}
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => handleDelete(item)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Feather name="trash-2" size={18} color="#EF4444" />
              )}
            </Pressable>
          </Pressable>
        )}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                <Feather name="x" size={24} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Supplier Name*</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sharma Plastics"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. contact@supplier.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Supplier's address"
                placeholderTextColor="#9CA3AF"
                multiline
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{editingSupplier ? "Save Changes" : "Create Supplier"}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  listContent: { paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  supplierInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 16 },
  name: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 2 },
  subtext: { fontSize: 14, color: "#6B7280" },
  addressText: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 40 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: Platform.OS === "ios" ? 48 : 32 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111" },
  closeIcon: { padding: 4 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, fontSize: 16, color: "#111111" },

  submitButton: { backgroundColor: "#8B5CF6", padding: 18, borderRadius: 14, alignItems: "center", marginTop: 12 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" }
});
