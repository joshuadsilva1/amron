import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, ActivityIndicator, Modal, FlatList } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router"; // <-- Import this to read the URL

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import SupplierOrderService, { OrderableItem, MaterialToSend } from "@/services/supplierService";
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
              keyExtractor={(item) => String(item.id)}
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

export default function DepartmentSupplierOrdersPage() {
  // 1. Grab the department ID directly from the URL (e.g., /departments/1/suppliers -> id is "1")
  const { id: deptId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data from Backend
  const [departmentName, setDepartmentName] = useState("Loading...");
  const [items, setItems] = useState<OrderableItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const search = useSearch(orders);
  const pagination = usePagination(search.filtered);

  // Dropdown rows: "M-001 — Switch cap" + what ordering it means.
  const itemOptions = items.map((i) => ({
    id: i.id,
    name: `${i.item_code} — ${i.name}${i.kind === "job_work" ? "  ·  made by supplier, you send material" : ""}`,
  }));
  const itemById = (id: string) => items.find((i) => i.id === id);
  const owedItems = items.filter((i) => i.owed_on_internal_pos > 0);

  // --- Single Order State ---
  const [singleItem, setSingleItem] = useState("");
  const [singleSupplier, setSingleSupplier] = useState("");
  const [singleQty, setSingleQty] = useState("");
  const [singleMaterials, setSingleMaterials] = useState<MaterialToSend[]>([]);
  const [singleUrgent, setSingleUrgent] = useState(false);
  const [singleNotes, setSingleNotes] = useState("");

  // --- Club Bulk Order State ---
  const [clubSupplier, setClubSupplier] = useState("");
  const [clubItem, setClubItem] = useState("");
  const [clubQty, setClubQty] = useState("");
  const [clubUrgent, setClubUrgent] = useState(false);
  const [clubNotes, setClubNotes] = useState("");
  const [clubItemsList, setClubItemsList] = useState<any[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const canApprove = user?.role === "PRODUCTION_MANAGER" || user?.role === "ADMIN";

  useEffect(() => {
    if (deptId) {
      fetchData();
    }
  }, [deptId]);

  // Job work: live "send the supplier X kg powder" as the qty is typed.
  useEffect(() => {
    const qty = parseFloat(singleQty);
    if (!singleItem || itemById(singleItem)?.kind !== "job_work" || !(qty > 0)) {
      setSingleMaterials([]);
      return;
    }
    const t = setTimeout(() => {
      SupplierOrderService.previewMaterials(singleItem, qty).then(setSingleMaterials).catch(() => setSingleMaterials([]));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleItem, singleQty, items]);

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
      const [suppliersData, itemsData, deptsData, ordersData] = await Promise.all([
        SupplierOrderService.getSuppliers().catch(() => []),
        SupplierOrderService.getOrderableItems(String(deptId)).catch(() => []),
        SupplierOrderService.getDepartments().catch(() => []),
        SupplierOrderService.getOrders().catch(() => [])
      ]);

      // 2. Find the department name for the UI header and locked boxes
      const currentDept = deptsData.find((d: any) => String(d.id) === String(deptId));
      if (currentDept) {
        setDepartmentName(currentDept.name);
      } else {
        setDepartmentName("Department");
      }

      setSuppliers(suppliersData);
      setItems(itemsData);

      // 3. STRICTLY filter orders to ONLY show ones belonging to this specific department URL
      const filteredOrders = ordersData.filter((o: any) => String(o.department_id) === String(deptId));
      setOrders(filteredOrders);

    } catch (error) {
      console.error("Failed to load supplier data", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSingleOrder = async () => {
    if (!deptId || !singleItem || !singleSupplier || !singleQty) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    
    try {
      setSubmitting(true);
      
      await SupplierOrderService.placeOrder({
        supplier_id: singleSupplier,
        department_id: String(deptId), // Strictly locked to URL ID
        notes: singleNotes,
        is_urgent: singleUrgent ? 1 : 0,
        items: [{
          product_id: singleItem,
          ordered_qty: parseFloat(singleQty)
        }]
      });
      
      Alert.alert("Success", `${departmentName} order placed successfully.`);
      
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
    
    const itemData = itemById(clubItem);
    
    setClubItemsList([...clubItemsList, { 
      product_id: clubItem, 
      product_name: itemData ? `${itemData.item_code} — ${itemData.name}` : "Item",
      ordered_qty: parseFloat(clubQty),
      unit: itemData?.unit_of_measure || "",
      is_urgent: clubUrgent 
    }]);
    
    setClubItem(""); setClubQty(""); setClubUrgent(false);
  };

  const handlePlaceClubOrder = async () => {
    if (!deptId || !clubSupplier || clubItemsList.length === 0) {
      Alert.alert("Error", "Select a supplier and add at least one item.");
      return;
    }

    try {
      setSubmitting(true);
      const hasUrgentItem = clubItemsList.some(item => item.is_urgent);

      await SupplierOrderService.placeOrder({
        supplier_id: clubSupplier,
        department_id: String(deptId), // Strictly locked to URL ID
        notes: clubNotes,
        is_urgent: hasUrgentItem ? 1 : 0,
        items: clubItemsList.map((i: any) => ({
          product_id: i.product_id,
          ordered_qty: i.ordered_qty
        }))
      });
      
      Alert.alert("Success", `${departmentName} bulk order placed successfully.`);
      
      setClubSupplier(""); setClubNotes(""); setClubItemsList([]);
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
      `Order #${String(o.id).substring(0, 6).toUpperCase()}`,
      o.supplier_name,
      o.items?.length || 0,
      o.is_urgent === 1 ? "Yes" : "No",
      o.status,
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF(`${departmentName} Supplier Orders`, headers, rows);
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
          {/* Dynamic Header specific to this page */}
          <Text style={styles.title}>{departmentName} Suppliers</Text>
          <Text style={styles.subtitle}>Place orders and track fulfilment specifically for {departmentName}.</Text>
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
            
            {/* 4. Strictly locked UI element - no dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ordering department</Text>
              <View style={[styles.inputBox, styles.lockedInputBox]}>
                <Text style={styles.lockedInputText}>{departmentName}</Text>
                <Feather name="lock" size={16} color="#9CA3AF" />
              </View>
            </View>

            {owedItems.length > 0 && (
              <View style={styles.owedBox}>
                <Text style={styles.owedTitle}>Still needed for open orders — tap to fill in</Text>
                {owedItems.map((i) => (
                  <Pressable
                    key={i.id}
                    style={styles.owedChip}
                    onPress={() => { setSingleItem(i.id); setSingleQty(String(i.owed_on_internal_pos)); }}
                  >
                    <Text style={styles.owedChipText}>{i.item_code} — {i.name}</Text>
                    <Text style={styles.owedChipQty}>{i.owed_on_internal_pos} {i.unit_of_measure}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <SelectInput label="Item" placeholder="Select item..." value={singleItem} options={itemOptions} onSelect={setSingleItem} />
            {items.length === 0 && !loading && (
              <Text style={styles.hintText}>Nothing to order for {departmentName} yet — add its parts under Items & QR and give them recipes.</Text>
            )}
            <SelectInput label="Supplier" placeholder="Assign supplier..." value={singleSupplier} options={suppliers} onSelect={setSingleSupplier} />
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Quantity</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput style={[styles.textInputBox, { flex: 1 }]} value={singleQty} onChangeText={(t) => setSingleQty(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" />
                  <Text style={styles.unitLabel}>{itemById(singleItem)?.unit_of_measure || ""}</Text>
                </View>
              </View>
            </View>

            {singleMaterials.length > 0 && (
              <View style={styles.sendBox}>
                <Text style={styles.sendTitle}>
                  <Feather name="arrow-up-right" size={13} color="#1D4ED8" /> You need to send {suppliers.find((x: any) => x.id === singleSupplier)?.name || "the supplier"}:
                </Text>
                {singleMaterials.map((m) => (
                  <Text key={m.product_id} style={styles.sendLine}>
                    • {m.quantity} {m.unit_of_measure} {m.name}
                    <Text style={styles.sendSub}>  ({m.per_unit} per piece{m.wastage_percent ? ` + ${m.wastage_percent}% wastage` : ""})</Text>
                  </Text>
                ))}
                <Text style={styles.sendSub}>Worked out from the recipe. Saved on the order so you can see it later.</Text>
              </View>
            )}

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
              <View style={{ flex: 1 }}>
                {/* Strictly locked UI element */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Department</Text>
                  <View style={[styles.inputBox, styles.lockedInputBox]}>
                    <Text style={styles.lockedInputText}>{departmentName}</Text>
                    <Feather name="lock" size={16} color="#9CA3AF" />
                  </View>
                </View>
              </View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}>
                <SelectInput label="Supplier" placeholder="Supplier..." value={clubSupplier} options={suppliers} onSelect={setClubSupplier} />
              </View>
            </View>

            <View style={styles.innerCard}>
              <Text style={styles.innerCardTitle}>Add item to club</Text>
              <SelectInput placeholder="Select item..." value={clubItem} options={itemOptions} onSelect={setClubItem} />
              
              <View style={styles.row}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput style={[styles.textInputBox, { flex: 1 }]} placeholder="Qty" value={clubQty} onChangeText={(t) => setClubQty(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" />
                  <Text style={styles.unitLabel}>{itemById(clubItem)?.unit_of_measure || ""}</Text>
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
            <Pagination {...pagination} />

            {loading ? (
              <ActivityIndicator size="large" color="#8B5CF6" />
            ) : orders.length === 0 ? (
              <Text style={styles.emptyText}>No {departmentName} orders yet.</Text>
            ) : (
              pagination.pageRows.map((o: any) => (
                <View key={o.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>
                      Order #{String(o.id).substring(0,6).toUpperCase()}
                      {o.is_urgent === 1 && <Text style={{ color: "#EF4444", fontSize: 12 }}> URGENT</Text>}
                    </Text>
                    <Text style={styles.orderSupplier}>{o.supplier_name}</Text>
                    {(o.items || []).map((it: any, idx: number) => (
                      <Text key={idx} style={styles.orderLine}>
                        {it.item_code ? `${it.item_code} — ` : ""}{it.product_name}: {it.ordered_qty} {it.unit_of_measure || ""}
                      </Text>
                    ))}
                    {(o.materials_to_send || []).length > 0 && (
                      <Text style={styles.orderSend}>
                        Send supplier: {o.materials_to_send.map((m: any) => `${m.quantity} ${m.unit_of_measure || ""} ${m.name}`).join(", ")}
                      </Text>
                    )}
                  </View>

                  {canApprove && o.status === "Pending" ? (
                    updatingOrderId === o.id ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
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
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xl },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 36, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4, textTransform: "capitalize" },
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
  
  row: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  inputGroup: { flex: 1, marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: "500", color: "#111111", marginBottom: 6 },
  
  inputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44 },
  lockedInputBox: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  lockedInputText: { fontSize: 15, color: "#6B7280", fontWeight: "600", textTransform: "capitalize" },
  
  textInputBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44, fontSize: 15, color: "#111111" },
  inputText: { fontSize: 15, color: "#111111", flex: 1 },
  placeholderText: { color: "#9CA3AF" },
  textArea: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15, color: "#111111", height: 80, textAlignVertical: "top" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, marginTop: -4 },
  checkboxLabel: { fontSize: 13, fontWeight: "600", marginLeft: 8 },

  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 12, borderRadius: 10, marginTop: spacing.xs },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  disabledBtn: { backgroundColor: "#D1D5DB" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", paddingVertical: 10, borderRadius: 8, marginTop: spacing.sm, borderWidth: 1, borderColor: "#E5E7EB" },
  secondaryBtnText: { color: "#374151", fontSize: 14, fontWeight: "600" },
  
  hintText: { fontSize: 12, color: "#9CA3AF", marginTop: -8, marginBottom: 12 },
  unitLabel: { fontSize: 14, fontWeight: "700", color: "#6B7280", minWidth: 28 },
  owedBox: { backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 10, padding: 10, marginBottom: spacing.md, gap: 6 },
  owedTitle: { fontSize: 12, fontWeight: "700", color: "#5B21B6" },
  owedChip: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.white, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: "#E9D5FF" },
  owedChipText: { fontSize: 13, color: "#374151", flex: 1 },
  owedChipQty: { fontSize: 13, fontWeight: "700", color: "#5B21B6" },
  sendBox: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 10, padding: 12, marginBottom: spacing.md, gap: 4 },
  sendTitle: { fontSize: 13, fontWeight: "700", color: "#1D4ED8" },
  sendLine: { fontSize: 14, fontWeight: "700", color: "#1E3A8A" },
  sendSub: { fontSize: 12, fontWeight: "400", color: "#6B7280" },
  orderLine: { fontSize: 13, color: "#374151", marginTop: 2 },
  orderSend: { fontSize: 12, fontWeight: "600", color: "#1D4ED8", marginTop: 4 },
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