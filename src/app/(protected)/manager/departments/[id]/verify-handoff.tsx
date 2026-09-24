import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import TransactionService, { PendingChallan } from "@/services/transactionService";

export default function VerifyHandoffPage() {
  const { id } = useLocalSearchParams();
  const departmentId = String(id || "");
  const [departmentName, setDepartmentName] = useState("Loading...");

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingChallan[]>([]);
  const search = useSearch(pending);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const [deptsRes, pendingData] = await Promise.all([
        api.get("/departments/"),
        TransactionService.getPendingChallans(departmentId).catch(() => []),
      ]);
      const allDepts = deptsRes.data?.data || deptsRes.data || [];
      const currentDept = allDepts.find((d: any) => String(d.id) === departmentId);
      setDepartmentName(currentDept?.name || "Unknown Department");
      setPending(pendingData);
    } catch (error) {
      console.warn("Failed to load pending handoffs:", error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async (challan: PendingChallan) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setVerifyingId(challan.id);
      await TransactionService.verifyChallan(challan.id, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        file: (asset as any).file,
      });

      Alert.alert("Verified", `Challan ${challan.challan_number} confirmed received.`);
      fetchData();
    } catch (error: any) {
      Alert.alert("Verification Failed", error?.message || "Could not verify this challan.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{departmentName} — Verify Handoffs</Text>
            <Text style={styles.subtitle}>
              Confirm what other departments have sent here — count what arrived, attach a photo, and verify.
            </Text>
          </View>
        </View>

        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search pending handoffs by challan, item, department..."
          resultCount={search.filtered.length}
          totalCount={pending.length}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : pending.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nothing waiting on verification right now.</Text>
          </View>
        ) : (
          search.filtered.map((challan) => (
            <View key={challan.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.challanNumber}>{challan.challan_number}</Text>
                  <Text style={styles.challanMeta}>
                    From {challan.from_department_name} · {challan.created_by} · {new Date(challan.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>

              <View style={styles.itemsList}>
                {challan.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.itemQty}>{item.quantity} {item.item_code ? `· ${item.item_code}` : ""}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.verifyBtn, verifyingId === challan.id && styles.verifyBtnDisabled]}
                onPress={() => handleVerify(challan)}
                disabled={verifyingId === challan.id}
              >
                <Feather name="camera" size={16} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.verifyBtnText}>
                  {verifyingId === challan.id ? "Verifying..." : "Attach photo & verify"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },

  headerRow: { marginBottom: spacing.lg },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  challanNumber: { fontSize: 16, fontWeight: "700", color: "#111111" },
  challanMeta: { fontSize: 12, color: "#6B7280", marginTop: 3 },

  pendingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingBadgeText: { fontSize: 11, fontWeight: "700", color: "#D97706" },

  itemsList: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10, marginBottom: 14 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#111111" },
  itemQty: { fontSize: 13, color: "#6B7280" },

  verifyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#111111", paddingVertical: 12, borderRadius: 10 },
  verifyBtnDisabled: { backgroundColor: "#9CA3AF" },
  verifyBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 40, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
