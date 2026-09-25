import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";
import SearchBar from "@/components/common/SearchBar";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import { useSortable } from "@/utils/useSortable";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_label: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  payload_before: any;
  payload_after: any;
  ip_address: string | null;
  created_at: string | null;
}

// One filter chip row, e.g. "All actions / role.permissions.update / ...".
const FilterChips = ({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
    <View style={{ flexDirection: "row", gap: 8 }}>
      {["All", ...options].map((opt) => {
        const active = (opt === "All" && !value) || opt === value;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt === "All" ? "" : opt)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  </ScrollView>
);

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [expanded, setExpanded] = useState<AuditLogRow | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource_type = resourceFilter;
      const res = await api.get("/admin/audit-logs", { params });
      setLogs(res.data?.data || []);
    } catch (error) {
      console.warn("Failed to load audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  const search = useSearch(logs, (l) => `${l.user_label} ${l.action} ${l.resource_type} ${l.resource_id}`);
  const { sorted, sortKey, sortDir, toggleSort } = useSortable<AuditLogRow>(search.filtered, "created_at" as any);
  const pagination = usePagination(sorted);

  const actionOptions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const resourceOptions = Array.from(new Set(logs.map((l) => l.resource_type))).sort();

  return (
    <View style={styles.container}>
      <Text style={styles.pageDesc}>
        Immutable trail of sensitive actions — role/permission changes, module toggles, settings edits, user role
        assignments, credential updates. Inventory movements have their own ledger under Transaction History.
      </Text>

      <FilterChips options={actionOptions} value={actionFilter} onSelect={setActionFilter} />
      <FilterChips options={resourceOptions} value={resourceFilter} onSelect={setResourceFilter} />

      <SearchBar
        value={search.query}
        onChangeText={search.setQuery}
        placeholder="Search by user, action, resource..."
        resultCount={search.filtered.length}
        totalCount={logs.length}
      />
      <Pagination {...pagination} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <SortableHeaderCell label="WHEN" active={sortKey === "created_at"} direction={sortDir} onPress={() => toggleSort("created_at" as any)} textStyle={styles.columnHeader} containerStyle={{ width: 160 }} />
            <SortableHeaderCell label="USER" active={sortKey === "user_label"} direction={sortDir} onPress={() => toggleSort("user_label" as any)} textStyle={styles.columnHeader} containerStyle={{ width: 150 }} />
            <SortableHeaderCell label="ACTION" active={sortKey === "action"} direction={sortDir} onPress={() => toggleSort("action" as any)} textStyle={styles.columnHeader} containerStyle={{ width: 200 }} />
            <SortableHeaderCell label="RESOURCE" active={sortKey === "resource_type"} direction={sortDir} onPress={() => toggleSort("resource_type" as any)} textStyle={styles.columnHeader} containerStyle={{ width: 160 }} />
            <Text style={[styles.columnHeader, { width: 100 }]}>IP</Text>
            <Text style={[styles.columnHeader, { width: 90, textAlign: "right" }]}>DETAILS</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
          ) : sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No matching audit entries.</Text>
            </View>
          ) : (
            pagination.pageRows.map((l) => (
              <View key={l.id} style={styles.tableRow}>
                <Text style={[styles.cellText, { width: 160, color: "#6B7280" }]}>
                  {l.created_at ? new Date(l.created_at).toLocaleString() : "-"}
                </Text>
                <Text style={[styles.cellText, { width: 150, fontWeight: "600" }]} numberOfLines={1}>
                  {l.user_label || "System"}
                </Text>
                <Text style={[styles.cellText, { width: 200 }]} numberOfLines={1}>{l.action}</Text>
                <Text style={[styles.cellText, { width: 160, color: "#6B7280" }]} numberOfLines={1}>
                  {l.resource_type}{l.resource_id ? ` · ${l.resource_id.slice(0, 8)}` : ""}
                </Text>
                <Text style={[styles.cellText, { width: 100, color: "#9CA3AF" }]} numberOfLines={1}>{l.ip_address || "-"}</Text>
                <View style={{ width: 90, alignItems: "flex-end" }}>
                  <Pressable onPress={() => setExpanded(l)} hitSlop={10}>
                    <Feather name="eye" size={16} color="#6B7280" />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={!!expanded} transparent animationType="fade" onRequestClose={() => setExpanded(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setExpanded(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{expanded?.action}</Text>
            <Text style={styles.modalSubtitle}>
              {expanded?.user_label || "System"} · {expanded?.resource_type} {expanded?.resource_id ? `#${expanded.resource_id}` : ""}
            </Text>
            <ScrollView style={{ maxHeight: 360, marginTop: 12 }}>
              <Text style={styles.payloadLabel}>Before</Text>
              <Text style={styles.payloadText}>{JSON.stringify(expanded?.payload_before, null, 2) || "—"}</Text>
              <Text style={[styles.payloadLabel, { marginTop: 12 }]}>After</Text>
              <Text style={styles.payloadText}>{JSON.stringify(expanded?.payload_after, null, 2) || "—"}</Text>
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setExpanded(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageDesc: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 14 },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#111111", borderColor: "#111111" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#FFFFFF" },

  tableWrapper: { marginTop: 12 },
  tableCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", minWidth: 860 },
  tableHeader: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: "#F9FAFB" },
  columnHeader: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 13, color: "#111111" },

  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyStateText: { fontSize: 14, color: "#9CA3AF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 480, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },
  modalSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  payloadLabel: { fontSize: 11, fontWeight: "700", color: "#8B5CF6", textTransform: "uppercase" },
  payloadText: { fontSize: 12, color: "#374151", fontFamily: "monospace", marginTop: 4 },
  closeBtn: { marginTop: 20, backgroundColor: "#111111", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
