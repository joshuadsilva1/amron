import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, ActivityIndicator, Modal, FlatList } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import SupplierOrderService, { Supplier } from "@/services/supplierService";
import { exportToExcel, exportToPDF } from "@/utils/export";
import useAuthStore from "@/store/authStore";

// --- Custom Dropdown Component ---
const SelectInput = ({ label, placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.inputBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.inputText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(item.id); setModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                    {item.name}
                  </Text>
                  {value === item.id && <Feather name="check" size={18} color="#8B5CF6" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const CustomCheckbox = ({ label, checked, onChange, color = "#EF4444" }: any) => (
  <Pressable style={styles.checkboxRow} onPress={() => onChange(!checked)}>
    <Feather name={checked ? "check-square" : "square"} size={18} color={checked ? color : "#9CA3AF"} />
    <Text style={[styles.checkboxLabel, { color }]}>{label}</Text>
  </Pressable>
);

export default function SupplierOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data from Backend
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const search = useSearch(orders);

  // Unit Options (UI Only - Your DB doesn't save unit for supplier items currently)
  const unitOptions = [{ id: "pcs", name: "pcs" }, { id: "kg", name: "kg" }, { id: "boxes", name: "boxes" }];

  // --- Single Order State ---
  const [singleDept, setSingleDept] = useState("");
  const [singleItem, setSingleItem] = useState("");
  const [singleSupplier, setSingleSupplier] = useState("");
  const [singleQty, setSingleQty] = useState("");
  const [singleUnit, setSingleUnit] = useState("pcs");
  const [singleUrgent, setSingleUrgent] = useState(false);
  const [singleNotes, setSingleNotes] = useState("");

  // --- Club Bulk Order State ---
  const [clubDept, setClubDept] = useState("");
  const [clubSupplier, setClubSupplier] = useState("");
  const [clubItem, setClubItem] = useState("");
  const [clubQty, setClubQty] = useState("");
  const [clubUnit, setClubUnit] = useState("pcs");
  const [clubUrgent, setClubUrgent] = useState(false);
  const [clubNotes, setClubNotes] = useState("");
  const [clubItemsList, setClubItemsList] = useState<any[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const canApprove = user?.role === "PRODUCTION_MANAGER" || user?.role === "ADMIN";

  useEffect(() => {
    fetchData();
  }, []);

  const handleOrderStatus = async (orderId: string, status: "Approved" | "Rejected") => {
    try {
      setUpdatingOrderId(orderId);
      await SupplierOrderService.updateOrderStatus(orderId, status);
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || `Failed to ${status.toLowerCase()} order.`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Run parallel requests
      const [suppliersData, itemsData, deptsData, ordersData] = await Promise.all([
        SupplierOrderService.getSuppliers(),
        SupplierOrderService.getItems().catch(() => []), // Failsafe if endpoint doesn't exist yet
        SupplierOrderService.getDepartments().catch(() => []),
        SupplierOrderService.getOrders()
      ]);

      setSuppliers(suppliersData);
      setItems(itemsData);
      setDepartments(deptsData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Failed to load supplier order data", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSingleOrder = async () => {
    if (!singleDept || !singleItem || !singleSupplier || !singleQty) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Sending exact payload structure for your POST /suppliers/orders
      await SupplierOrderService.placeOrder({
        supplier_id: singleSupplier,
        department_id: singleDept,
        notes: singleNotes,
        is_urgent: singleUrgent ? 1 : 0,
        items: [{
          product_id: singleItem,
          ordered_qty: parseInt(singleQty, 10)
        }]
      });
      
      Alert.alert("Success", "Order placed successfully.");
      
      // Reset form
      setSingleItem(""); setSingleQty(""); setSingleNotes(""); setSingleUrgent(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddClubItem = () => {
    if (!clubItem || !clubQty) return;
    
    const itemData: any = items.find((i: any) => i.id === clubItem);
    
    setClubItemsList([...clubItemsList, { 
      product_id: clubItem, 
      product_name: itemData?.name || "Item", 
      ordered_qty: parseInt(clubQty, 10), 
      unit: clubUnit, 
      is_urgent: clubUrgent 
    }]);
    
    setClubItem(""); setClubQty(""); setClubUrgent(false);
  };

  const handlePlaceClubOrder = async () => {
    if (!clubDept || !clubSupplier || clubItemsList.length === 0) {
      Alert.alert("Error", "Select a department, supplier, and add at least one item.");
      return;
    }

    try {
      setSubmitting(true);
      
      // Checking if any item in the club order was marked urgent to flag the whole order
      const hasUrgentItem = clubItemsList.some(item => item.is_urgent);

      await SupplierOrderService.placeOrder({
        supplier_id: clubSupplier,
        department_id: clubDept,
        notes: clubNotes,
        is_urgent: hasUrgentItem ? 1 : 0,
        items: clubItemsList.map((i: any) => ({
          product_id: i.product_id,
          ordered_qty: i.ordered_qty
        }))
      });
      
      Alert.alert("Success", "Club bulk order placed successfully.");
      
      // Reset form
      setClubDept(""); setClubSupplier(""); setClubNotes(""); setClubItemsList([]);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to place club order");
    } finally {
      setSubmitting(false);
    }
  };

  const getExportData = () => ({
    headers: ["Order #", "Supplier", "Items", "Urgent", "Status"],
    rows: orders.map((o: any) => [
      `Order #${o.id.substring(0, 6).toUpperCase()}`,
      o.supplier_name,
      o.items?.length || 0,
      o.is_urgent === 1 ? "Yes" : "No",
      o.status,
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF("Supplier Orders", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel("supplier_orders", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Supplier Orders</Text>
          <Text style={styles.subtitle}>Place orders to suppliers and track partial fulfilment.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
            <Feather name="file-text" size={14} color="#374151" style={{ marginRight: 6 }} />
            <Text style={styles.exportText}>Excel</Text>
          </Pressable>
          <Pressable style={styles.exportBtn} onPress={handleExportPDF}>
            <Feather name="file" size={14} color="#374151" style={{ marginRight: 6 }} />
            <Text style={styles.exportText}>PDF</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mainLayout}>
        <View style={styles.leftColumn}>
          
          {/* Card 1: Single Order */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Place an order</Text>
            
            <SelectInput label="Ordering department" placeholder="Department..." value={singleDept} options={departments} onSelect={setSingleDept} />
            <SelectInput label="Item" placeholder="Select item..." value={singleItem} options={items} onSelect={setSingleItem} />
            <SelectInput label="Supplier" placeholder="Assign supplier..." value={singleSupplier} options={suppliers} onSelect={setSingleSupplier} />
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput style={styles.textInputBox} value={singleQty} onChangeText={setSingleQty} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.md }]}>
                <SelectInput label="Unit" placeholder="pcs" value={singleUnit} options={unitOptions} onSelect={setSingleUnit} />
              </View>
            </View>

            <CustomCheckbox label="Mark URGENT" checked={singleUrgent} onChange={setSingleUrgent} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.textArea} multiline numberOfLines={3} value={singleNotes} onChangeText={setSingleNotes} />
            </View>

            <Pressable style={[styles.primaryBtn, submitting && styles.disabledBtn]} onPress={handlePlaceSingleOrder} disabled={submitting}>
              <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>{submitting ? "Placing..." : "Place order"}</Text>
            </Pressable>
          </View>

          {/* Card 2: Club bulk order */}
          <View style={[styles.card, { borderColor: "#D8B4FE", borderWidth: 1 }]}>
            <Text style={styles.cardTitle}>Club bulk order</Text>
            <Text style={styles.cardSubtitle}>
              Add several items and place them together as one order to one supplier.
            </Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}><SelectInput label="Department" placeholder="Dept..." value={clubDept} options={departments} onSelect={setClubDept} /></View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}><SelectInput label="Supplier" placeholder="Supplier..." value={clubSupplier} options={suppliers} onSelect={setClubSupplier} /></View>
            </View>

            <View style={styles.innerCard}>
              <Text style={styles.innerCardTitle}>Add item to club</Text>
              <SelectInput placeholder="Select item..." value={clubItem} options={items} onSelect={setClubItem} />
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TextInput style={styles.textInputBox} placeholder="Qty" value={clubQty} onChangeText={setClubQty} keyboardType="numeric" />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <SelectInput placeholder="pcs" value={clubUnit} options={unitOptions} onSelect={setClubUnit} />
                </View>
              </View>

              <CustomCheckbox label="URGENT" checked={clubUrgent} onChange={setClubUrgent} />

              <Pressable style={styles.secondaryBtn} onPress={handleAddClubItem}>
                <Feather name="plus" size={16} color="#374151" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryBtnText}>Add to club</Text>
              </Pressable>
            </View>

            {/* Render added items */}
            {clubItemsList.map((item, idx) => (
              <View key={idx} style={styles.clubItemBadge}>
                <Text style={styles.clubItemText}>
                  {item.product_name} - {item.ordered_qty} {item.unit} {item.is_urgent && <Text style={{color: '#EF4444'}}>(URGENT)</Text>}
                </Text>
                <Pressable onPress={() => setClubItemsList(clubItemsList.filter((_, i) => i !== idx))}>
                  <Feather name="x" size={16} color="#EF4444" />
                </Pressable>
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.textArea} multiline numberOfLines={3} value={clubNotes} onChangeText={setClubNotes} />
            </View>

            <Pressable 
              style={[styles.primaryBtn, (clubItemsList.length === 0 || submitting) && styles.disabledBtn]} 
              disabled={clubItemsList.length === 0 || submitting}
              onPress={handlePlaceClubOrder}
            >
              <Feather name="truck" size={16} color={clubItemsList.length === 0 ? "#9CA3AF" : colors.white} style={{ marginRight: 6 }} />
              <Text style={[styles.primaryBtnText, clubItemsList.length === 0 && { color: "#9CA3AF" }]}>
                {submitting ? "Placing..." : `Place club order (${clubItemsList.length})`}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.rightColumn}>
          <View style={styles.listCard}>
            <SearchBar
              value={search.query}
              onChangeText={search.setQuery}
              placeholder="Search orders by supplier, item, status..."
              resultCount={search.filtered.length}
              totalCount={orders.length}
            />
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : orders.length === 0 ? (
              <Text style={styles.emptyText}>No orders yet.</Text>
            ) : (
              search.filtered.map((o: any) => (
                <View key={o.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>
                      Order #{o.id.substring(0,6).toUpperCase()}
                      {o.is_urgent === 1 && <Text style={{ color: "#EF4444", fontSize: 12 }}> URGENT</Text>}
                    </Text>
                    <Text style={styles.orderSupplier}>{o.supplier_name} • {o.items?.length || 0} items</Text>
                  </View>

                  {canApprove && o.status === "Pending" ? (
                    updatingOrderId === o.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View style={styles.approvalActions}>
                        <Pressable style={styles.rejectBtn} onPress={() => handleOrderStatus(o.id, "Rejected")}>
                          <Feather name="x" size={14} color="#EF4444" />
                        </Pressable>
                        <Pressable style={styles.approveBtn} onPress={() => handleOrderStatus(o.id, "Approved")}>
                          <Feather name="check" size={14} color={colors.white} />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </Pressable>
                      </View>
                    )
                  ) : (
                    <View style={[
                      styles.statusBadge,
                      o.status === "Approved" && styles.statusBadgeApproved,
                      o.status === "Rejected" && styles.statusBadgeRejected,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        o.status === "Approved" && styles.statusTextApproved,
                        o.status === "Rejected" && styles.statusTextRejected,
                      ]}>{o.status}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { padding: spacing.xl },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xl },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 36, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6B7280" },
  headerActions: { flexDirection: "row", gap: 12 },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  exportText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  mainLayout: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'flex-start' },
  leftColumn: { width: Platform.OS === 'web' ? 380 : '100%', marginRight: Platform.OS === 'web' ? spacing.xl : 0 },
  rightColumn: { flex: 1, width: '100%', marginTop: Platform.OS === 'web' ? 0 : spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.xl, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#111111", marginBottom: spacing.lg },
  cardSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: spacing.lg, lineHeight: 18 },
  innerCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.md },
  innerCardTitle: { fontSize: 13, fontWeight: "600", color: "#111111", marginBottom: spacing.md },
  listCard: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.xl, borderWidth: 1, borderColor: "#E5E7EB", minHeight: 400, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  emptyText: { color: "#6B7280", fontSize: 15 },
  
  // Custom Dropdown & Inputs
  row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  inputGroup: { flex: 1, marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: "500", color: "#111111", marginBottom: 6 },
  inputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44 },
  textInputBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44, fontSize: 15, color: "#111111" },
  inputText: { fontSize: 15, color: "#111111", flex: 1 },
  placeholderText: { color: "#9CA3AF" },
  textArea: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15, color: "#111111", height: 80, textAlignVertical: "top" },
  
  // Modal Picker
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  // Checkbox
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, marginTop: -4 },
  checkboxLabel: { fontSize: 13, fontWeight: "600", marginLeft: 8 },

  // Buttons & Badges
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 12, borderRadius: 10, marginTop: spacing.xs },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  disabledBtn: { backgroundColor: "#E5E7EB" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", paddingVertical: 10, borderRadius: 8, marginTop: spacing.sm },
  secondaryBtnText: { color: "#374151", fontSize: 14, fontWeight: "600" },
  
  clubItemBadge: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F3F4F6", padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  clubItemText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 4 },
  orderSupplier: { fontSize: 13, color: '#6B7280' },
  statusBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  statusBadgeApproved: { backgroundColor: '#DCFCE7' },
  statusTextApproved: { color: '#16A34A' },
  statusBadgeRejected: { backgroundColor: '#FEE2E2' },
  statusTextRejected: { color: '#EF4444' },

  approvalActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center' },
  approveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, gap: 6 },
  approveBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});