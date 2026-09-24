import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SymbolView } from "expo-symbols";

import AsyncStorage from "@react-native-async-storage/async-storage";

import AppTextInput from "@/components/common/AppTextInput";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import { exportToExcel, exportToPDF } from "@/utils/export";
import { SCANNER_MODE_KEY } from "@/constants/settingsKeys";

type ScanMode = "SINGLE" | "MULTIPLE";
type ScanAction = "IN" | "OUT";
type ScanTarget = "ITEM" | "RACK" | null;

// --- Department picker modal ---
const DepartmentPicker = ({ visible, departments, onSelect, onClose }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <Pressable style={styles.dropdownOverlay} onPress={onClose}>
      <View style={styles.dropdownModal}>
        <Text style={styles.dropdownTitle}>Select department</Text>
        <FlatList
          data={departments}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.dropdownOption} onPress={() => onSelect(item)}>
              <Text style={styles.dropdownOptionText}>{item.name}</Text>
            </Pressable>
          )}
        />
      </View>
    </Pressable>
  </Modal>
);

export default function ScanInOutScreen() {
  // --- States ---
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>("SINGLE");
  const [action, setAction] = useState<ScanAction>("IN");

  // Data States
  const [departments, setDepartments] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form States
  const [department, setDepartment] = useState<{ id: string; name: string } | null>(null);
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);
  const [itemQR, setItemQR] = useState("");
  const [manualItemDraft, setManualItemDraft] = useState("");
  const [rackQR, setRackQR] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [chalan, setChalan] = useState("");

  // Camera States
  const [cameraActive, setCameraActive] = useState<ScanTarget>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingQc, setCheckingQc] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SCANNER_MODE_KEY).then((stored) => {
      if (stored === "SINGLE" || stored === "MULTIPLE") setMode(stored);
    });
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingData(true);
        const [deptsRes, itemsRes] = await Promise.all([
          api.get("/departments"),
          api.get("/items"),
        ]);
        const depts = deptsRes.data?.data || [];
        setDepartments(depts);
        setMasterItems(itemsRes.data?.data || []);
        if (depts.length > 0) setDepartment(depts[0]);
      } catch (error) {
        console.warn("Failed to fetch scan data", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (department) fetchMovements(department.id);
  }, [department?.id]);

  const fetchMovements = async (departmentId: string) => {
    try {
      const res = await api.get(`/transactions/history/${departmentId}`);
      setMovements(res.data?.data || []);
    } catch (error) {
      console.warn("Failed to fetch movements", error);
    }
  };

  // --- Handlers ---
  const openCamera = async (target: ScanTarget) => {
    if (Platform.OS === "web") {
      const code = window.prompt(`Simulate Camera: Enter ${target === "ITEM" ? "Item" : "Rack"} Code`);
      if (code) {
        if (target === "ITEM") resolveItemScan(code);
        if (target === "RACK") setRackQR(code);
      }
      return;
    }
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert("Error", "Camera permission is required.");
    }
    setCameraActive(target);
  };

  // Hard validation rule: a batch/bin that hasn't passed QC must never be
  // scanned IN. Bins are looked up by QR code in the registry — a code
  // that isn't a registered bin (e.g. a plain item-master barcode with no
  // batch/QC tracking) is unaffected and scans in as before. The backend
  // enforces the same rule on submit (see /transactions/manual), so a
  // network hiccup here can't be used to bypass the gate.
  const resolveItemScan = async (code: string) => {
    setManualItemDraft("");
    if (action !== "IN") {
      setItemQR(code);
      return;
    }
    setCheckingQc(true);
    try {
      const res = await api.get(`/transactions/bin/${encodeURIComponent(code)}`);
      const qcStatus = res.data?.data?.qc_status;
      if (qcStatus && qcStatus !== "Passed") {
        Alert.alert(
          "QC Not Approved",
          `This batch's QC status is '${qcStatus}'. It cannot be scanned in until QC approves it.`
        );
        return;
      }
      setItemQR(code);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // Not a QC-tracked bin — scan in as a plain item.
        setItemQR(code);
      } else {
        console.warn("QC lookup failed, allowing scan (server will re-check on submit)", error);
        setItemQR(code);
      }
    } finally {
      setCheckingQc(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (processing) return;
    setProcessing(true);

    if (cameraActive === "ITEM") resolveItemScan(data);
    if (cameraActive === "RACK") setRackQR(data);

    setCameraActive(null);
    setTimeout(() => setProcessing(false), 500);
  };

  const handleSubmit = async () => {
    if (!itemQR || !rackQR) {
      Alert.alert("Missing Data", "Please scan both the Item and the Rack.");
      return;
    }
    if (!department) {
      Alert.alert("Missing Data", "Please select a receiving department.");
      return;
    }
    const product = masterItems.find((i) => i.item_code === itemQR);
    if (!product) {
      Alert.alert("Error", `Item code '${itemQR}' not found in the master catalogue.`);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        product_id: product.id,
        transaction_type: action,
        quantity: parseFloat(quantity) || 1,
        department_id: department.id,
        reason: `Rack: ${rackQR}`,
        reference_number: chalan || undefined,
        qr_code_string: itemQR || undefined,
      };
      const res = await api.post("/transactions/manual", payload);
      Alert.alert("Success", res.data?.message || `Recorded ${action} for ${quantity} items at rack ${rackQR}.`);

      setItemQR("");
      setRackQR("");
      setQuantity("1");
      setChalan("");
      fetchMovements(department.id);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to record movement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF(
        `Recent Movements — ${department?.name || "All"}`,
        ["Item", "Type", "Qty", "Reason", "Date"],
        movements.map((m) => [
          m.item_name,
          m.transaction_type,
          m.quantity,
          m.reason || "-",
          m.date ? new Date(m.date).toLocaleDateString() : "-",
        ])
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel(
        "recent_movements",
        ["Item", "Type", "Qty", "Reason", "Date"],
        movements.map((m) => [
          m.item_name,
          m.transaction_type,
          m.quantity,
          m.reason || "-",
          m.date ? new Date(m.date).toLocaleDateString() : "-",
        ])
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  // --- UI Components ---
  const renderSegmentedControl = (
    options: { label: string; value: string; icon?: string }[],
    selectedValue: string,
    onSelect: (val: any) => void
  ) => (
    <View style={styles.segmentContainer}>
      {options.map((opt) => {
        const isActive = selectedValue === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
            onPress={() => onSelect(opt.value)}
          >
            {opt.icon && (
              <SymbolView
                name={opt.icon as any}
                size={18}
                tintColor={isActive ? colors.white : colors.navy}
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scan In / Out</Text>
          <Text style={styles.subtitle}>
            Move stock with your phone camera. Every scan updates inventory automatically.
          </Text>
        </View>

        {/* Top Mode Toggle */}
        <View style={{ marginBottom: spacing.lg }}>
          {renderSegmentedControl(
            [
              { label: "Single item", value: "SINGLE", icon: "checkmark.circle" },
              { label: "Multiple items", value: "MULTIPLE", icon: "square.stack.3d.up" },
            ],
            mode,
            setMode
          )}
        </View>

        {/* Left Card: Scan Form */}
        <View style={styles.card}>
          <View style={{ marginBottom: spacing.lg }}>
            {renderSegmentedControl(
              [
                { label: "Scan IN", value: "IN", icon: "arrow.down.to.line" },
                { label: "Scan OUT", value: "OUT", icon: "arrow.up.from.line" },
              ],
              action,
              setAction
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receiving department</Text>
            <Pressable style={styles.pickerFake} onPress={() => setDeptPickerVisible(true)}>
              <Text style={styles.pickerFakeText}>
                {loadingData ? "Loading..." : department?.name || "Select department..."}
              </Text>
              <SymbolView name="chevron.down" size={16} tintColor={colors.secondary} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>1. Scan item QR (or type its code below)</Text>
            <Pressable style={styles.scanBtn} onPress={() => openCamera("ITEM")} disabled={checkingQc}>
              {checkingQc ? (
                <ActivityIndicator size="small" color={colors.navy} style={{ marginRight: 8 }} />
              ) : (
                <SymbolView name="camera" size={20} tintColor={colors.navy} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.scanBtnText}>
                {checkingQc ? "Checking QC status…" : itemQR ? `Item: ${itemQR}` : "Scan item"}
              </Text>
            </Pressable>
            <View style={styles.manualRow}>
              <AppTextInput
                value={manualItemDraft}
                onChangeText={setManualItemDraft}
                placeholder="or type item code, then press Go"
                style={{ flex: 1 }}
                onSubmitEditing={() => manualItemDraft.trim() && resolveItemScan(manualItemDraft.trim())}
              />
              <Pressable
                style={styles.manualGoBtn}
                onPress={() => manualItemDraft.trim() && resolveItemScan(manualItemDraft.trim())}
                disabled={!manualItemDraft.trim() || checkingQc}
              >
                <Text style={styles.manualGoBtnText}>Go</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>2. Scan rack QR (required) (or type it below)</Text>
            <Pressable style={styles.scanBtn} onPress={() => openCamera("RACK")}>
              <SymbolView name="camera" size={20} tintColor={colors.navy} style={{ marginRight: 8 }} />
              <Text style={styles.scanBtnText}>{rackQR ? `Rack: ${rackQR}` : "Scan rack"}</Text>
            </Pressable>
            <View style={styles.manualRow}>
              <AppTextInput
                value={rackQR}
                onChangeText={setRackQR}
                placeholder="or type rack code"
                style={{ flex: 1 }}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Quantity</Text>
              <AppTextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.label}>Chalan no.</Text>
              <AppTextInput value={chalan} onChangeText={setChalan} placeholder="" />
            </View>
          </View>

          <Pressable
            style={[styles.submitBtn, (!itemQR || !rackQR || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!itemQR || !rackQR || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <SymbolView name="checkmark.circle" size={20} tintColor={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Record {action}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Right Card: Recent Movements */}
        <View style={styles.card}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent movements</Text>
            <View style={styles.row}>
              <Pressable style={[styles.exportBtn, { backgroundColor: "#8B5CF6", marginRight: 8 }]} onPress={handleExportPDF}>
                <SymbolView name="doc.text" size={14} tintColor={colors.white} style={{ marginRight: 4 }} />
                <Text style={[styles.exportText, { color: colors.white }]}>PDF</Text>
              </Pressable>
              <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
                <SymbolView name="tablecells" size={14} tintColor={colors.navy} style={{ marginRight: 4 }} />
                <Text style={styles.exportText}>Excel</Text>
              </Pressable>
            </View>
          </View>

          {movements.length === 0 ? (
            <Text style={styles.emptyText}>No movements yet.</Text>
          ) : (
            movements.slice(0, 10).map((m, idx) => (
              <View key={m.id || idx} style={styles.movementRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.movementItem}>{m.item_name}</Text>
                  <Text style={styles.movementMeta}>{m.reason || "-"}</Text>
                </View>
                <Text style={[styles.movementQty, { color: m.transaction_type === "IN" ? "#059669" : "#DC2626" }]}>
                  {m.transaction_type === "IN" ? "+" : "-"}{m.quantity}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Department Picker Modal */}
      <DepartmentPicker
        visible={deptPickerVisible}
        departments={departments}
        onSelect={(dept: any) => { setDepartment(dept); setDeptPickerVisible(false); }}
        onClose={() => setDeptPickerVisible(false)}
      />

      {/* Fullscreen Camera Modal */}
      <Modal visible={!!cameraActive} animationType="slide" transparent={false}>
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraInstructions}>
              Scanning {cameraActive === "ITEM" ? "Item" : "Rack"} QR Code
            </Text>
            <View style={styles.scanTarget} />
            <Pressable style={styles.closeCameraBtn} onPress={() => setCameraActive(null)}>
              <Text style={styles.closeCameraText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.lg, gap: spacing.lg },

  header: { marginBottom: spacing.xs },
  title: { fontSize: 28, fontWeight: "800", color: "#1F2937", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280" },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },

  // Segmented Controls (Toggle Buttons)
  segmentContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#E5E7EB" },
  segmentBtn: { flex: 1, flexDirection: "row", paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  segmentBtnActive: { backgroundColor: "#8B5CF6", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  segmentTextActive: { color: colors.white },

  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "500", color: "#1F2937", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center" },

  pickerFake: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, backgroundColor: colors.white },
  pickerFakeText: { color: "#6B7280", fontSize: 14 },

  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  scanBtnText: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  manualRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  manualGoBtn: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 16, height: 44, alignItems: "center", justifyContent: "center" },
  manualGoBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },

  submitBtn: { flexDirection: "row", backgroundColor: "#A78BFA", padding: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  // Recent Movements Card
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  recentTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  exportText: { fontSize: 12, fontWeight: "600", color: "#1F2937" },
  emptyText: { color: "#6B7280", fontSize: 14 },

  movementRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  movementItem: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  movementMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  movementQty: { fontSize: 14, fontWeight: "700" },

  // Dropdown Modal (department picker)
  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden" },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  // Camera Overlay
  cameraContainer: { flex: 1, backgroundColor: "#000000" },
  cameraOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  cameraInstructions: { color: colors.white, fontSize: 20, fontWeight: "700", marginBottom: 40, textAlign: "center" },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: "#8B5CF6", backgroundColor: "transparent", borderRadius: 16 },
  closeCameraBtn: { marginTop: 40, padding: 16, backgroundColor: colors.white, borderRadius: 8 },
  closeCameraText: { color: colors.navy, fontSize: 16, fontWeight: "700" }
});
