import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, FlatList } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import MRPService, { MRPSupplierGroup, MRPItem } from "@/services/mrpService";
import SupplierOrderService, { Supplier } from "@/services/supplierService";

const SelectInput = ({ placeholder, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <>
      <Pressable style={styles.pickBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.pickBtnText}>{placeholder}</Text>
        <Feather name="chevron-down" size={14} color="#6B7280" />
      </Pressable>
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.pickerModal}>
            <FlatList
              data={options || []}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.pickerOption} onPress={() => { onSelect(item.id); setModalVisible(false); }}>
                  <Text style={styles.pickerOptionText}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.pickerEmpty}>No suppliers yet — add one under Suppliers first.</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default function MRPScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<MRPSupplierGroup[]>([]);
  const search = useSearch(groups);
  const pagination = usePagination(search.filtered);
  const [shortageCount, setShortageCount] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [creatingOrderFor, setCreatingOrderFor] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summary, supplierList] = await Promise.all([
        MRPService.getSummary(),
        SupplierOrderService.getSuppliers().catch(() => []),
      ]);
      setGroups(summary.grouped_by_supplier);
      setShortageCount(summary.shortage_count);
      setSuppliers(supplierList);
    } catch (error) {
      console.error("Failed to load MRP summary", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAssign = async (itemId: string, supplierId: string) => {
    setAssigningItemId(null);
    try {
      await MRPService.assignSupplier(itemId, supplierId);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to assign supplier.");
    }
  };

  const handleCreateOrder = async (group: MRPSupplierGroup) => {
    if (!group.supplier_id) {
      Alert.alert("No supplier", "Assign a supplier to these items first.");
      return;
    }
    try {
      setCreatingOrderFor(group.supplier_id);
      await SupplierOrderService.placeOrder({
        supplier_id: group.supplier_id,
        department_id: "",
        is_urgent: 0,
        notes: "Auto-generated from Material Requirements (MRP)",
        items: group.items.map((i) => ({ product_id: i.item_id, ordered_qty: Math.ceil(i.shortage) })),
      });
      Alert.alert("Success", `Supplier order created for ${group.supplier_name} — ${group.items.length} item(s).`);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to create supplier order.");
    } finally {
      setCreatingOrderFor(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Material Requirements</Text>
          <Text style={styles.subtitle}>
            {shortageCount > 0
              ? `${shortageCount} item${shortageCount === 1 ? "" : "s"} short, exploded through open orders' BOMs — not just a stock-level check.`
              : "No shortages right now, based on open orders and current stock."}
          </Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
          <Feather name="refresh-cw" size={16} color={colors.navy} />
        </Pressable>
      </View>

      <SearchBar
        value={search.query}
        onChangeText={search.setQuery}
        placeholder="Search shortages by material or supplier..."
        resultCount={search.filtered.length}
        totalCount={groups.length}
      />
      <Pagination {...pagination} />
      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="check-circle" size={28} color="#22C55E" />
          <Text style={styles.emptyText}>Nothing short. All open orders are covered by stock + incoming supplies.</Text>
        </View>
      ) : (
        pagination.pageRows.map((group) => (
          <View key={group.supplier_id || "unassigned"} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupTitle}>{group.supplier_name}</Text>
                <Text style={styles.groupSubtitle}>{group.items.length} item{group.items.length === 1 ? "" : "s"} short</Text>
              </View>
              {group.supplier_id && (
                <Pressable
                  style={styles.createOrderBtn}
                  onPress={() => handleCreateOrder(group)}
                  disabled={creatingOrderFor === group.supplier_id}
                >
                  {creatingOrderFor === group.supplier_id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Feather name="shopping-cart" size={14} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.createOrderBtnText}>Create Supplier Order</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {group.items.map((item: MRPItem) => (
              <View key={item.item_id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.item_name}</Text>
                  <Text style={styles.itemCode}>{item.item_code || "No code"}</Text>
                  <View style={styles.metricsRow}>
                    <Text style={styles.metric}>Physical: {item.physical_stock}</Text>
                    <Text style={styles.metric}>Reserved: {item.reserved}</Text>
                    <Text style={[styles.metric, item.available < 0 && styles.metricNegative]}>Available: {item.available}</Text>
                    <Text style={styles.metric}>Incoming: {item.incoming}</Text>
                  </View>
                </View>
                <View style={styles.shortageBox}>
                  <Text style={styles.shortageValue}>{Math.ceil(item.shortage)}</Text>
                  <Text style={styles.shortageLabel}>SHORT</Text>
                </View>
                {!group.supplier_id && (
                  assigningItemId === item.item_id ? (
                    <SelectInput
                      placeholder="Pick supplier..."
                      options={suppliers}
                      onSelect={(supplierId: string) => handleAssign(item.item_id, supplierId)}
                    />
                  ) : (
                    <Pressable style={styles.assignBtn} onPress={() => setAssigningItemId(item.item_id)}>
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </Pressable>
                  )
                )}
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.xl },
  title: { fontSize: 30, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  refreshBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 40, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center" },

  groupCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.lg, overflow: "hidden" },
  groupHeader: { flexDirection: "row", alignItems: "center", padding: spacing.lg, backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  groupTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  groupSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  createOrderBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  createOrderBtnText: { color: colors.white, fontSize: 12, fontWeight: "700" },

  itemRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#111111" },
  itemCode: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 },
  metric: { fontSize: 11, color: "#6B7280" },
  metricNegative: { color: "#DC2626", fontWeight: "700" },

  shortageBox: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 70 },
  shortageValue: { fontSize: 18, fontWeight: "900", color: "#DC2626" },
  shortageLabel: { fontSize: 9, fontWeight: "700", color: "#DC2626", letterSpacing: 0.5 },

  assignBtn: { backgroundColor: "#F3F4F6", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  assignBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  pickBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, gap: 4 },
  pickBtnText: { fontSize: 12, color: "#374151" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  pickerModal: { width: "100%", maxWidth: 360, maxHeight: "60%", backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  pickerOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerOptionText: { fontSize: 15, color: "#374151" },
  pickerEmpty: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
});
