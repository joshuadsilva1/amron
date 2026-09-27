import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import Alert from "@/utils/alert";
import api from "@/services/api";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { exportToPDF } from "@/utils/export";

interface ReqItem {
  item_id: string;
  item_code: string | null;
  name: string;
  unit_of_measure: string | null;
  material: string | null;
  required: number;
  in_stock: number | null;
  made_here: boolean;
  used_for: string[];
  urgent: boolean;
}

interface DeptGroup {
  department_id: string | null;
  department_name: string;
  level: number;
  tracks_stock: boolean;
  items: ReqItem[];
}

interface OpenOrder {
  po_id: string;
  client_name: string | null;
  challan_number: string | null;
  due_date: string | null;
}

const TILE_COLORS = ["#EEF2FF", "#FDF2F8", "#FEF2F2", "#ECFDF5", "#FFF7ED", "#ECFEFF", "#F5F3FF", "#FEFCE8", "#F0F9FF"];
const fmt = (n: number) => String(Math.round((n || 0) * 1000) / 1000);
const orderLabel = (o: OpenOrder) => `${o.client_name || "Client"} — ${o.challan_number || o.po_id.slice(0, 6)}`;

// Everything the open customer POs need, from every department, on one
// page: finished goods, the parts each department makes, and the raw
// materials (powder etc.) — every recipe level, grouped by department.
// "Required" is exactly what the orders need; stock is shown next to it
// but never subtracted.
export default function MaterialRequirementsScreen() {
  const params = useLocalSearchParams<{ department_id?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<DeptGroup[]>([]);
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [selectedPoIds, setSelectedPoIds] = useState<string[]>([]);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [activeDept, setActiveDept] = useState<string>(params.department_id ? String(params.department_id) : "all");

  const fetchData = useCallback(async () => {
    try {
      const query = selectedPoIds.map((id) => `po_id=${encodeURIComponent(id)}`).join("&");
      const res = await api.get(`/mrp/requirements${query ? `?${query}` : ""}`);
      setGroups(res.data?.departments || []);
      if (selectedPoIds.length === 0) setOrders(res.data?.orders || []);
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to load material requirements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPoIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Opened from a department's menu: jump to that department.
  useEffect(() => {
    if (params.department_id) setActiveDept(String(params.department_id));
  }, [params.department_id]);

  // Flat rows so one search box covers every department.
  const allRows = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => ({ ...i, department_id: g.department_id, department_name: g.department_name }))),
    [groups]
  );
  const search = useSearch(allRows, (r) => `${r.item_code} ${r.name} ${r.department_name} ${r.material || ""} ${r.used_for.join(" ")}`);
  const visibleIds = useMemo(() => new Set(search.filtered.map((r) => `${r.department_id}:${r.item_id}`)), [search.filtered]);

  const shownGroups = groups
    .filter((g) => activeDept === "all" || String(g.department_id) === activeDept)
    .map((g) => ({ ...g, items: g.items.filter((i) => visibleIds.has(`${g.department_id}:${i.item_id}`)) }))
    .filter((g) => g.items.length > 0);

  const handleExportPDF = async () => {
    try {
      const scope = selectedPoIds.length
        ? orders.filter((o) => selectedPoIds.includes(o.po_id)).map(orderLabel).join(", ")
        : "all open orders";
      const rows = shownGroups.flatMap((g) =>
        g.items.map((i) => [
          g.department_name,
          i.item_code || "-",
          i.name + (i.urgent ? " (URGENT)" : ""),
          i.material || "-",
          `${fmt(i.required)} ${i.unit_of_measure || ""}`,
          i.in_stock === null ? "not tracked" : `${fmt(i.in_stock)} ${i.unit_of_measure || ""}`,
          i.used_for.join(", "),
        ])
      );
      await exportToPDF(
        `Material Requirements — ${scope}`,
        ["Department", "Code", "Item", "Material", "Required", "In stock", "For"],
        rows
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error?.message || "Could not generate PDF.");
    }
  };

  const togglePo = (poId: string) =>
    setSelectedPoIds((prev) => (prev.includes(poId) ? prev.filter((id) => id !== poId) : [...prev, poId]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Material Requirements</Text>
          <Text style={styles.subtitle}>
            What every department needs for open orders — finished goods, parts and raw materials, every recipe level.
            Required is exactly what the orders need; stock is shown alongside, not subtracted.
          </Text>
        </View>
        <Pressable style={styles.pdfBtn} onPress={handleExportPDF} disabled={shownGroups.length === 0}>
          <Feather name="file-text" size={15} color={colors.white} />
          <Text style={styles.pdfBtnText}>Export PDF</Text>
        </Pressable>
      </View>

      {/* Department tiles */}
      <View style={styles.tiles}>
        <Pressable style={[styles.tile, { backgroundColor: "#F3F4F6" }, activeDept === "all" && styles.tileActive]} onPress={() => setActiveDept("all")}>
          <Feather name="grid" size={20} color="#374151" />
          <Text style={styles.tileName}>All departments</Text>
          <Text style={styles.tileCount}>{allRows.length} items</Text>
        </Pressable>
        {groups.map((g, idx) => {
          const key = String(g.department_id);
          const urgentCount = g.items.filter((i) => i.urgent).length;
          return (
            <Pressable
              key={key}
              style={[styles.tile, { backgroundColor: TILE_COLORS[idx % TILE_COLORS.length] }, activeDept === key && styles.tileActive]}
              onPress={() => setActiveDept(activeDept === key ? "all" : key)}
            >
              <Feather name="box" size={20} color="#374151" />
              <Text style={styles.tileName} numberOfLines={1}>{g.department_name}</Text>
              <Text style={styles.tileCount}>
                {g.items.length} item{g.items.length === 1 ? "" : "s"}
                {urgentCount ? `  •  ${urgentCount} urgent` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filters}>
        <Pressable style={styles.orderFilter} onPress={() => setOrderPickerOpen(true)}>
          <Feather name="filter" size={14} color="#374151" />
          <Text style={styles.orderFilterText} numberOfLines={1}>
            {selectedPoIds.length === 0 ? "All open orders" : `${selectedPoIds.length} order${selectedPoIds.length === 1 ? "" : "s"} selected`}
          </Text>
          <Feather name="chevron-down" size={14} color="#9CA3AF" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 240 }}>
          <SearchBar
            value={search.query}
            onChangeText={search.setQuery}
            placeholder="Search code, item, material, finished good..."
            resultCount={search.filtered.length}
            totalCount={allRows.length}
            style={{ marginBottom: 0 }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : shownGroups.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="check-circle" size={28} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {allRows.length === 0 ? "No open orders need anything right now." : "Nothing matches."}
          </Text>
        </View>
      ) : (
        shownGroups.map((g) => (
          <View key={String(g.department_id)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{g.department_name}</Text>
              <Text style={styles.sectionCount}>{g.items.length} item{g.items.length === 1 ? "" : "s"}</Text>
              {!g.tracks_stock && <Text style={styles.untracked}>No stock tracking</Text>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 860, flex: 1 }}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.col, { width: 110 }]}>CODE</Text>
                  <Text style={[styles.col, { flex: 1, minWidth: 200 }]}>ITEM</Text>
                  <Text style={[styles.col, { width: 90 }]}>MATERIAL</Text>
                  <Text style={[styles.col, { width: 130, textAlign: "right" }]}>REQUIRED</Text>
                  <Text style={[styles.col, { width: 130, textAlign: "right" }]}>IN STOCK</Text>
                  <Text style={[styles.col, { width: 180, paddingLeft: 16 }]}>FOR</Text>
                </View>
                {g.items.map((i) => (
                  <View key={i.item_id} style={styles.row}>
                    <Text style={[styles.cellBold, { width: 110 }]}>{i.item_code || "-"}</Text>
                    <View style={{ flex: 1, minWidth: 200 }}>
                      <Text style={styles.cell}>
                        {i.urgent && <Text style={styles.urgent}>URGENT  </Text>}
                        {i.name}
                      </Text>
                      <Text style={styles.sub}>{i.made_here ? "Made from a recipe" : "Bought / raw material"}</Text>
                    </View>
                    <Text style={[styles.cell, { width: 90 }]}>{i.material || "-"}</Text>
                    <Text style={[styles.cellBold, { width: 130, textAlign: "right" }]}>
                      {fmt(i.required)} {i.unit_of_measure || ""}
                    </Text>
                    <Text style={[styles.cell, { width: 130, textAlign: "right", color: "#6B7280" }]}>
                      {i.in_stock === null ? "not tracked" : `${fmt(i.in_stock)} ${i.unit_of_measure || ""}`}
                    </Text>
                    <Text style={[styles.sub, { width: 180, paddingLeft: 16 }]} numberOfLines={2}>{i.used_for.join(", ")}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))
      )}

      <Modal visible={orderPickerOpen} transparent animationType="fade" onRequestClose={() => setOrderPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOrderPickerOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Which orders?</Text>
            <Pressable style={styles.modalOption} onPress={() => setSelectedPoIds([])}>
              <Feather name={selectedPoIds.length === 0 ? "check-square" : "square"} size={18} color={selectedPoIds.length === 0 ? "#8B5CF6" : "#9CA3AF"} />
              <Text style={styles.modalOptionText}>All open orders</Text>
            </Pressable>
            <FlatList
              data={orders}
              keyExtractor={(o) => o.po_id}
              renderItem={({ item: o }) => (
                <Pressable style={styles.modalOption} onPress={() => togglePo(o.po_id)}>
                  <Feather name={selectedPoIds.includes(o.po_id) ? "check-square" : "square"} size={18} color={selectedPoIds.includes(o.po_id) ? "#8B5CF6" : "#9CA3AF"} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionText}>{orderLabel(o)}</Text>
                    {!!o.due_date && <Text style={styles.sub}>Due {new Date(o.due_date).toLocaleDateString()}</Text>}
                  </View>
                </Pressable>
              )}
            />
            <Pressable style={[styles.pdfBtn, { alignSelf: "flex-end", margin: 12 }]} onPress={() => setOrderPickerOpen(false)}>
              <Text style={styles.pdfBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: spacing.lg },
  title: { fontSize: 30, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  pdfBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  pdfBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },

  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.lg },
  tile: { width: 150, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: "transparent", gap: 6 },
  tileActive: { borderColor: "#8B5CF6" },
  tileName: { fontSize: 13, fontWeight: "800", color: "#111111", textTransform: "uppercase" },
  tileCount: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: spacing.lg },
  orderFilter: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, height: 42, paddingHorizontal: 12, maxWidth: 280 },
  orderFilterText: { fontSize: 14, color: "#374151", fontWeight: "600", flexShrink: 1 },

  section: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.lg, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111111" },
  sectionCount: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  untracked: { fontSize: 11, fontWeight: "700", color: "#92400E", backgroundColor: "#FEF3C7", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 10, paddingHorizontal: 16 },
  col: { fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  cell: { fontSize: 14, color: "#374151" },
  cellBold: { fontSize: 14, fontWeight: "700", color: "#111111" },
  sub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  urgent: { color: "#DC2626", fontWeight: "800" },

  empty: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 440, maxHeight: "75%", backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalOptionText: { fontSize: 14, color: "#374151" },
});
