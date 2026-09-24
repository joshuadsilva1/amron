import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, FlatList, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import useAuthStore from "@/store/authStore";
import TransactionService, { BinDetails, ChallanHistoryEntry } from "@/services/transactionService";
import AdminService from "@/services/adminService";

export default function AllotAndHandoffPage() {
  const { id } = useLocalSearchParams();
  const departmentId = String(id || "");
  const { user } = useAuthStore();

  const [permission, requestPermission] = useCameraPermissions();

  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState("Loading...");
  const [destinations, setDestinations] = useState<{ id: string; name: string }[]>([]);
  const [selectedToDeptId, setSelectedToDeptId] = useState<string>("");
  const [recentHandoffs, setRecentHandoffs] = useState<ChallanHistoryEntry[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [scannedBins, setScannedBins] = useState<BinDetails[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPageData = useCallback(async () => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const [allDepts, routes, history] = await Promise.all([
        TransactionService.getDepartments().catch(() => []),
        AdminService.getRoutes().catch(() => []),
        TransactionService.getChallanHistory().catch(() => []),
      ]);

      const currentDept = allDepts.find((d: any) => String(d.id) === departmentId);
      const currentName = currentDept?.name || "Unknown Department";
      setDepartmentName(currentName);

      const destIds = routes
        .filter((r) => String(r.fromId) === departmentId)
        .map((r) => String(r.toId));
      const destDepts = allDepts
        .filter((d: any) => destIds.includes(String(d.id)))
        .map((d: any) => ({ id: String(d.id), name: d.name }));
      setDestinations(destDepts);
      setSelectedToDeptId((prev) => prev || destDepts[0]?.id || "");

      setRecentHandoffs(history.filter((h) => h.origin === currentName).slice(0, 15));
    } catch (error) {
      console.warn("Failed to load handoff data:", error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan bins.");
        return;
      }
    }
    setIsScanning(true);
  };

  // Shared by the camera scanner and manual entry.
  const addBinByCode = async (code: string) => {
    if (scannedBins.some((bin) => bin.qr_code_string === code)) return;
    try {
      const bin = await TransactionService.getBinDetails(code);

      if (bin.qc_status !== "Passed") {
        Alert.alert("Handoff Blocked", `Bin ${code} has QC status "${bin.qc_status}" — only Passed bins can be handed off.`);
      } else if (bin.current_department !== departmentName) {
        Alert.alert("Wrong Department", `Bin ${code} is currently in ${bin.current_department}, not ${departmentName}.`);
      } else {
        setScannedBins((prev) => [...prev, bin]);
      }
    } catch (error: any) {
      Alert.alert("Not Found", error?.response?.data?.error || "Invalid QR code.");
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (processingScan) return;
    setProcessingScan(true);
    try {
      await addBinByCode(data);
    } finally {
      setTimeout(() => setProcessingScan(false), 1200);
    }
  };

  const handleAddManual = async () => {
    const code = manualCode.trim();
    if (!code) return;
    try {
      setAddingManual(true);
      await addBinByCode(code);
      setManualCode("");
    } finally {
      setAddingManual(false);
    }
  };

  const handleSubmitHandoff = async () => {
    if (scannedBins.length === 0) {
      Alert.alert("Error", "Scan at least one bin first.");
      return;
    }
    if (!selectedToDeptId) {
      Alert.alert("Error", "Select a destination department.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await TransactionService.transferScannedBins({
        from_department_id: departmentId,
        to_department_id: selectedToDeptId,
        qr_codes: scannedBins.map((b) => b.qr_code_string),
        user_name: user?.name || "Unknown",
      });

      Alert.alert("Success", `Handoff complete. Challan: ${response.challan_number}`);
      setScannedBins([]);
      fetchPageData();
    } catch (error: any) {
      Alert.alert("Handoff Failed", error?.response?.data?.error || "Could not complete handoff.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isScanning) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={[StyleSheet.absoluteFill, styles.scannerOverlay]}>
          <View style={styles.scanTarget} />
          <Text style={styles.scanInstruction}>Scan bin QR codes to hand off to {destinations.find(d => d.id === selectedToDeptId)?.name || "destination"}</Text>
          <Text style={styles.scanCount}>{scannedBins.length} scanned</Text>
          <Pressable style={styles.doneBtn} onPress={() => setIsScanning(false)}>
            <Text style={styles.doneBtnText}>Done Scanning</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{departmentName} — Allot &amp; Handoff</Text>
            <Text style={styles.subtitle}>
              Scan QC-passed bins to hand them off to the next department along an approved route.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : destinations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No outbound handoff routes are configured from {departmentName}. An admin can add one in Admin → Routing Editor.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Hand off to</Text>
              <View style={styles.destRow}>
                {destinations.map((dept) => (
                  <Pressable
                    key={dept.id}
                    style={[styles.destChip, selectedToDeptId === dept.id && styles.destChipSelected]}
                    onPress={() => setSelectedToDeptId(dept.id)}
                  >
                    <Text style={[styles.destChipText, selectedToDeptId === dept.id && styles.destChipTextSelected]}>
                      {dept.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.scanRow}>
                <Text style={styles.scannedCountText}>{scannedBins.length} bin{scannedBins.length === 1 ? "" : "s"} scanned</Text>
                <Pressable style={styles.scanBtn} onPress={openScanner}>
                  <Feather name="camera" size={16} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.scanBtnText}>Scan bins</Text>
                </Pressable>
              </View>

              <View style={styles.manualRow}>
                <TextInput
                  style={styles.manualInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="or type a bin's QR code, then Add"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="go"
                  onSubmitEditing={handleAddManual}
                />
                <Pressable style={styles.manualAddBtn} onPress={handleAddManual} disabled={!manualCode.trim() || addingManual}>
                  {addingManual ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.manualAddBtnText}>Add</Text>}
                </Pressable>
              </View>

              {scannedBins.length > 0 && (
                <View style={styles.binsList}>
                  {scannedBins.map((bin) => (
                    <View key={bin.qr_code_string} style={styles.binRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.binName}>{bin.item_name}</Text>
                        <Text style={styles.binMeta}>{bin.qr_code_string} • {bin.quantity} {bin.unit_of_measure}</Text>
                      </View>
                      <Pressable onPress={() => setScannedBins((prev) => prev.filter((b) => b.qr_code_string !== bin.qr_code_string))} hitSlop={10}>
                        <Feather name="x" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                style={[styles.submitBtn, (submitting || scannedBins.length === 0) && styles.submitBtnDisabled]}
                onPress={handleSubmitHandoff}
                disabled={submitting || scannedBins.length === 0}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? "Handing off..." : `Hand off ${scannedBins.length || ""} bin${scannedBins.length === 1 ? "" : "s"}`}
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recent handoffs from {departmentName}</Text>
              {recentHandoffs.length === 0 ? (
                <Text style={styles.emptyText}>No handoffs recorded yet.</Text>
              ) : (
                <FlatList
                  data={recentHandoffs}
                  keyExtractor={(item) => item.challan_number}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.historyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyChallan}>{item.challan_number}</Text>
                        <Text style={styles.historyMeta}>
                          → {item.destination} • {item.items.length} item{item.items.length === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                    </View>
                  )}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },

  headerRow: { marginBottom: spacing.xl },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },

  destRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  destChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  destChipSelected: { backgroundColor: "#111111", borderColor: "#111111" },
  destChipText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  destChipTextSelected: { color: colors.white },

  scanRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  scannedCountText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  scanBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  scanBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  manualRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  manualInput: { flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },
  manualAddBtn: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 20, height: 44, alignItems: "center", justifyContent: "center" },
  manualAddBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },

  binsList: { marginTop: 16, gap: 10 },
  binRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  binName: { fontSize: 14, fontWeight: "700", color: "#111111" },
  binMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#111111", paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  submitBtnDisabled: { backgroundColor: "#9CA3AF" },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },

  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  historyChallan: { fontSize: 14, fontWeight: "700", color: "#111111" },
  historyMeta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  historyDate: { fontSize: 13, color: "#9CA3AF" },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 100, justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },

  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerOverlay: { justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", padding: 24 },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: "#8B5CF6", borderRadius: 16 },
  scanInstruction: { color: colors.white, marginTop: 20, fontSize: 16, fontWeight: "700", textAlign: "center" },
  scanCount: { color: colors.white, marginTop: 8, fontSize: 14, fontWeight: "600", opacity: 0.8 },
  doneBtn: { position: "absolute", bottom: 50, backgroundColor: colors.white, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#111111" },
});
