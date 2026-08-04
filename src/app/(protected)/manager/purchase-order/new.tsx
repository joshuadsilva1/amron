import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch, Modal, FlatList, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import OrderService from "@/services/orderService";
import ClientService, { Client } from "@/services/clientService";
import OEMService, { OEMMapping } from "@/services/oemService";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

const SelectInput = ({ placeholder, value, options, onSelect, renderLabel }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View>
      <Pressable style={styles.selectBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? (renderLabel ? renderLabel(selectedOption) : selectedOption.name) : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            {(!options || options.length === 0) ? (
              <Text style={styles.dropdownEmptyText}>No options available.</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.dropdownOption}
                    onPress={() => { onSelect(item.id); setModalVisible(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                      {renderLabel ? renderLabel(item) : item.name}
                    </Text>
                    {value === item.id && <Feather name="check" size={18} color="#8B5CF6" />}
                  </Pressable>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function NewPOScreen() {
  const [loadingData, setLoadingData] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<OEMMapping[]>([]);

  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState([{ mapping_id: "", quantity: "" }]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [clientsData, mappingsData] = await Promise.all([
          ClientService.getClients(),
          OEMService.getMappings(),
        ]);
        setClients(clientsData);
        setMappings(mappingsData);
      } catch (error) {
        console.warn("Failed to load clients/mappings", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const mappingsForClient = clientId ? mappings.filter((m) => m.client_id === clientId) : [];

  const addItem = () => {
    setItems([...items, { mapping_id: "", quantity: "" }]);
  };

  const updateItem = (index: number, field: "mapping_id" | "quantity", value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!clientId) {
      Alert.alert("Error", "Please select a client.");
      return;
    }

    const validItems = items
      .filter((i) => i.mapping_id && i.quantity)
      .map((i) => ({ mapping_id: i.mapping_id, quantity: parseInt(i.quantity, 10) }));

    if (validItems.length === 0) {
      Alert.alert("Error", "At least one valid item is required.");
      return;
    }

    if (dueDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      Alert.alert("Error", "Due date must be in YYYY-MM-DD format, e.g. 2026-08-15.");
      return;
    }

    try {
      setSubmitting(true);
      await OrderService.createPO({
        client_id: clientId,
        notes,
        is_urgent: isUrgent ? 1 : 0,
        due_date: dueDate.trim() || undefined,
        challan_number: challanNumber.trim() || undefined,
        items: validItems,
      });

      Alert.alert("Success", "Purchase Order created successfully.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to create PO.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Purchase Order</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Client</Text>
        <SelectInput
          placeholder="Select client..."
          value={clientId}
          options={clients.map((c) => ({ id: c.id, name: c.name }))}
          onSelect={(val: string) => {
            setClientId(val);
            setItems([{ mapping_id: "", quantity: "" }]);
          }}
        />
        {clients.length === 0 && (
          <Text style={styles.helperText}>No clients yet — add one under Clients first.</Text>
        )}

        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Due date (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Chalan number (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={challanNumber}
              onChangeText={setChallanNumber}
              placeholder="e.g. CH-2026-001"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions..."
          placeholderTextColor="#9CA3AF"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Mark as urgent</Text>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: "#E5E7EB", true: "#EF4444" }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionTitle}>Line items (OEM codes)</Text>
          <Pressable style={styles.addItemBtn} onPress={addItem} disabled={!clientId}>
            <Feather name="plus" size={16} color={colors.white} />
          </Pressable>
        </View>

        {!clientId ? (
          <Text style={styles.helperText}>Select a client first to see their OEM product codes.</Text>
        ) : mappingsForClient.length === 0 ? (
          <Text style={styles.helperText}>
            This client has no OEM product codes mapped yet — go to Party Products (OEM) → the "OEM Mappings" tab → "Add Mapping" to create one.
          </Text>
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={{ flex: 2 }}>
                <SelectInput
                  placeholder="OEM product code..."
                  value={item.mapping_id}
                  options={mappingsForClient.map((m) => ({ id: m.id, name: `${m.party_code} — ${m.internal_product}` }))}
                  onSelect={(val: string) => updateItem(index, "mapping_id", val)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.qtyInput}
                  value={item.quantity}
                  onChangeText={(text) => updateItem(index, "quantity", text.replace(/\D/g, ""))}
                  placeholder="Qty"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
              {items.length > 1 && (
                <Pressable style={styles.removeBtn} onPress={() => removeItem(index)}>
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>
          ))
        )}

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? "Submitting..." : "Submit order"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.lg },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: spacing.lg },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8, marginTop: 4 },
  helperText: { fontSize: 13, color: "#9CA3AF", marginTop: 4, marginBottom: 12 },

  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48, marginBottom: 4 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500", flex: 1 },

  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownEmptyText: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151", flex: 1 },

  textInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 16, height: 48, fontSize: 15, color: "#111111", marginBottom: 4 },

  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  formRow: { flexDirection: "row", gap: 12 },

  itemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },
  addItemBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },

  itemRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  qtyInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, height: 48, paddingHorizontal: 12, fontSize: 15, color: "#111111", textAlign: "center" },
  removeBtn: { padding: 8 },

  submitBtn: { backgroundColor: "#8B5CF6", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitBtnDisabled: { backgroundColor: "#D1D5DB" },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
