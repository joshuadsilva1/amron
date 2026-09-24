import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Platform, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import AppTextInput from "@/components/common/AppTextInput";
import ClientService, { Client } from "@/services/clientService"; // Ensure path is correct
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import { useSortable } from "@/utils/useSortable";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const search = useSearch(clients);
  const { sorted: sortedClients, sortKey, sortDir, toggleSort } = useSortable<Client>(search.filtered);

  // Form State
  const [formName, setFormName] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await ClientService.getClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      Alert.alert("Error", "Could not load clients from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!formName || !formPhone) return;
    
    try {
      setSaving(true);
      await ClientService.createClient({
        name: formName,
        contact_email: formContactEmail,
        phone: formPhone,
        shipping_address: formAddress,
      });
      
      // Refresh list from server
      await fetchClients();
      
      // Reset form & close modal
      setFormName("");
      setFormContactEmail("");
      setFormPhone("");
      setFormAddress("");
      setIsModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Clients</Text>
            <Text style={styles.subtitle}>
              Companies that place orders. WhatsApp numbers are used for automatic reports.
            </Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
            <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add client</Text>
          </Pressable>
        </View>

        {/* Table Card */}
        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search clients..."
          resultCount={search.filtered.length}
          totalCount={clients.length}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="NAME" active={sortKey === "name"} direction={sortDir} onPress={() => toggleSort("name")} textStyle={styles.columnHeader} containerStyle={{ width: 200 }} />
              <SortableHeaderCell label="CONTACT / EMAIL" active={sortKey === "contact_email"} direction={sortDir} onPress={() => toggleSort("contact_email")} textStyle={styles.columnHeader} containerStyle={{ width: 200 }} />
              <SortableHeaderCell label="WHATSAPP" active={sortKey === "phone"} direction={sortDir} onPress={() => toggleSort("phone")} textStyle={styles.columnHeader} containerStyle={{ width: 150 }} />
              <SortableHeaderCell label="ADDRESS" active={sortKey === "shipping_address"} direction={sortDir} onPress={() => toggleSort("shipping_address")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 250 }} />
            </View>

            <View style={styles.tableBody}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : clients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No clients yet.</Text>
                </View>
              ) : (
                sortedClients.map((client) => (
                  <View key={client.id} style={styles.tableRow}>
                    <Text style={[styles.cellText, styles.cellTextBold, { width: 200 }]}>{client.name}</Text>
                    <Text style={[styles.cellText, { width: 200 }]}>{client.contact_email || "-"}</Text>
                    <Text style={[styles.cellText, { width: 150 }]}>{client.phone || "-"}</Text>
                    <Text style={[styles.cellText, { flex: 1, minWidth: 250 }]}>{client.shipping_address || "-"}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Add Client Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Feather name="x" size={24} color={colors.secondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name *</Text>
              <AppTextInput value={formName} onChangeText={setFormName} placeholder="e.g. Acme Corp" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Email</Text>
              <AppTextInput value={formContactEmail} onChangeText={setFormContactEmail} placeholder="e.g. john@acme.com" keyboardType="email-address" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp Number *</Text>
              <AppTextInput 
                value={formPhone} 
                onChangeText={setFormPhone} 
                placeholder="+91 98765 43210" 
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shipping Address</Text>
              <AppTextInput value={formAddress} onChangeText={setFormAddress} placeholder="Company Address" />
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setIsModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.saveBtn, (!formName || !formPhone || saving) && styles.saveBtnDisabled]} 
                onPress={handleAddClient}
                disabled={!formName || !formPhone || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Client"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { padding: spacing.xl },
  header: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: Platform.OS === "web" ? "flex-start" : "stretch", marginBottom: spacing.xxl },
  headerTextContainer: { flex: 1, marginBottom: Platform.OS === "web" ? 0 : spacing.lg, marginRight: spacing.lg },
  title: { fontSize: 36, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", lineHeight: 24 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  addBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 800, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableBody: { minHeight: 200 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: "#6B7280", fontSize: 15 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  cellTextBold: { fontWeight: "600", color: "#111111" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { width: "100%", maxWidth: 500, backgroundColor: colors.white, borderRadius: 16, padding: spacing.xl, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111111" },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.xl, gap: spacing.md },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: "#F3F4F6" },
  cancelBtnText: { color: "#4B5563", fontWeight: "600", fontSize: 14 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: "#8B5CF6" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
});