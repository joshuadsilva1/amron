import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, ActivityIndicator, Image, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera"; // <-- Live Camera imports!
import * as DocumentPicker from "expo-document-picker";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import TransactionService from "@/services/transactionService";
import { exportToPDF } from "@/utils/export";

// --- Custom Dropdown Component ---
const SelectInput = ({ label, placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.selectBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
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

export default function ScanInOutPage() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  // Camera Permissions & Scanner State
  const [permission, requestPermission] = useCameraPermissions();
  const [activeScanner, setActiveScanner] = useState<"item" | "rack" | null>(null);

  // Data States
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  // Mode & Action States
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [scanType, setScanType] = useState<"in" | "out">("in");

  // Form State
  const [scannedItemCode, setScannedItemCode] = useState<string | null>(null);
  const [scannedRack, setScannedRack] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [chalanNo, setChalanNo] = useState("");
  const [chalanPhoto, setChalanPhoto] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Recent Movements List
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [deptsRes, itemsRes] = await Promise.all([
          api.get(`/departments`),
          api.get(`/items`) 
        ]);
        
        const allDepts = deptsRes.data?.data || deptsRes.data || [];
        setDepartments(allDepts);
        setMasterItems(itemsRes.data?.data || []);

        if (id) {
          setSelectedDeptId(String(id));
          fetchMovements(String(id));
        } else if (allDepts.length > 0) {
          setSelectedDeptId(String(allDepts[0].id));
          fetchMovements(String(allDepts[0].id));
        }
      } catch (error) {
        console.warn("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

  useEffect(() => {
    if (selectedDeptId && !loading) {
      fetchMovements(selectedDeptId);
    }
  }, [selectedDeptId]);

  const fetchMovements = async (deptId: string) => {
    if (!deptId) return;
    try {
      const res = await api.get(`/transactions/history/${deptId}`);
      setMovements(res.data?.data || []);
    } catch (e) {
      console.warn("Failed to fetch history:", e);
    }
  };

  // --- Live Camera Trigger Logic ---
  const openScanner = async (type: "item" | "rack") => {
    if (Platform.OS === 'web') {
      const code = window.prompt(`Simulate Camera: Enter ${type === 'item' ? 'Item' : 'Rack'} Code`);
      if (code) {
        if (type === "item") setScannedItemCode(code);
        if (type === "rack") setScannedRack(code);
      }
      return;
    }

    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan QR codes.");
        return;
      }
    }
    
    setActiveScanner(type);
  };

  // --- Handles the actual barcode read event ---
  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    if (activeScanner === "item") {
      setScannedItemCode(data);
    } else if (activeScanner === "rack") {
      setScannedRack(data);
    }
    
    // Auto-close scanner after successful read
    setActiveScanner(null);
  };

  const handleCaptureChalan = async () => {
    // Uses expo-document-picker (already a dependency) filtered to images —
    // there's no camera-capture picker installed yet, so this is gallery/
    // files only, not a live camera shot.
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setChalanPhoto(result.assets[0]);
    } catch (error) {
      console.warn("Failed to pick chalan photo:", error);
      Alert.alert("Error", "Could not open the file picker.");
    }
  };

  const handleExportMovementsPDF = async () => {
    try {
      await exportToPDF(
        "Recent Movements",
        ["Item", "Type", "Qty", "Reason", "Chalan", "Date"],
        movements.map((m: any) => [
          m.item_name,
          m.transaction_type,
          m.quantity,
          m.reason || "-",
          m.reference_number || "-",
          m.date || "-",
        ])
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleRecordMovement = async () => {
    if (!scannedItemCode) {
      Alert.alert("Notice", "Please scan an item QR code.");
      return;
    }
    if (!selectedDeptId) {
      Alert.alert("Notice", "Please select a department.");
      return;
    }

    const product = masterItems.find(i => i.item_code === scannedItemCode);
    if (!product) {
      Alert.alert("Error", `Item code '${scannedItemCode}' not found in the master catalogue.`);
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        product_id: product.id,
        transaction_type: scanType.toUpperCase(),
        quantity: parseFloat(quantity) || 1,
        department_id: selectedDeptId,
        reason: scannedRack ? `Rack: ${scannedRack}` : 'Standard Scan',
        reference_number: chalanNo || undefined
      };

      const res = await api.post('/transactions/manual', payload);

      if (chalanPhoto && res.data?.id) {
        try {
          await TransactionService.attachManualAdjustmentPhoto(res.data.id, {
            uri: chalanPhoto.uri,
            name: chalanPhoto.name,
            mimeType: chalanPhoto.mimeType,
            file: (chalanPhoto as any).file,
          });
        } catch (photoError) {
          console.warn("Failed to attach chalan photo:", photoError);
          Alert.alert("Note", "Movement recorded, but the chalan photo failed to upload.");
        }
      }

      Alert.alert("Success", res.data.message || `Recorded Stock ${scanType.toUpperCase()} successfully.`);

      setScannedItemCode(null);
      setScannedRack(null);
      setQuantity("1");
      setChalanNo("");
      setChalanPhoto(null); 
      
      fetchMovements(selectedDeptId);
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to record movement.";
      Alert.alert("Scan Error", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>Scan In / Out</Text>
          <Text style={styles.subtitle}>
            Move stock with your phone camera. Every scan updates inventory automatically.
          </Text>
        </View>

        <View style={styles.modeTabsRow}>
          <Pressable style={[styles.modeTab, mode === "single" && styles.modeTabActive]} onPress={() => setMode("single")}>
            <Feather name="check-circle" size={16} color={mode === "single" ? colors.white : "#374151"} style={{ marginRight: 8 }} />
            <Text style={[styles.modeTabText, mode === "single" && styles.modeTabTextActive]}>Single item</Text>
          </Pressable>

          <Pressable style={[styles.modeTab, mode === "multiple" && styles.modeTabActive]} onPress={() => setMode("multiple")}>
            <Feather name="layers" size={16} color={mode === "multiple" ? colors.white : "#374151"} style={{ marginRight: 8 }} />
            <Text style={[styles.modeTabText, mode === "multiple" && styles.modeTabTextActive]}>Multiple items</Text>
          </Pressable>
        </View>

        <View style={styles.workspaceRow}>
          
          {/* Left Column: Scan Form */}
          <View style={styles.leftColumn}>
            <View style={styles.card}>
              
              <View style={styles.toggleRow}>
                <Pressable style={[styles.toggleBtn, scanType === "in" && styles.toggleBtnActive]} onPress={() => setScanType("in")}>
                  <Feather name="arrow-down-left" size={16} color={scanType === "in" ? colors.white : "#374151"} style={{ marginRight: 6 }} />
                  <Text style={[styles.toggleBtnText, scanType === "in" && styles.toggleBtnTextActive]}>Scan IN</Text>
                </Pressable>

                <Pressable style={[styles.toggleBtn, scanType === "out" && styles.toggleBtnActive]} onPress={() => setScanType("out")}>
                  <Feather name="arrow-up-right" size={16} color={scanType === "out" ? colors.white : "#374151"} style={{ marginRight: 6 }} />
                  <Text style={[styles.toggleBtnText, scanType === "out" && styles.toggleBtnTextActive]}>Scan OUT</Text>
                </Pressable>
              </View>

              <SelectInput 
                label="Department" 
                placeholder="Select department..." 
                value={selectedDeptId} 
                options={departments} 
                onSelect={setSelectedDeptId} 
              />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>1. Scan item QR</Text>
                <Pressable style={[styles.scanTriggerBtn, scannedItemCode && { borderColor: "#8B5CF6", backgroundColor: "#F5F3FF" }]} onPress={() => openScanner("item")}>
                  <Feather name="camera" size={18} color={scannedItemCode ? "#8B5CF6" : "#374151"} style={{ marginRight: 8 }} />
                  <Text style={[styles.scanTriggerText, scannedItemCode && { color: "#8B5CF6" }]}>
                    {scannedItemCode ? `Scanned: ${scannedItemCode}` : "Scan item"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>2. Scan rack QR (optional)</Text>
                <Pressable style={[styles.scanTriggerBtn, scannedRack && { borderColor: "#8B5CF6", backgroundColor: "#F5F3FF" }]} onPress={() => openScanner("rack")}>
                  <Feather name="camera" size={18} color={scannedRack ? "#8B5CF6" : "#374151"} style={{ marginRight: 8 }} />
                  <Text style={[styles.scanTriggerText, scannedRack && { color: "#8B5CF6" }]}>
                    {scannedRack ? `Scanned: ${scannedRack}` : "Scan rack"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Chalan no.</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={chalanNo}
                    onChangeText={setChalanNo}
                    placeholder="Enter chalan..."
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Attach Chalan Photo</Text>
                {chalanPhoto ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: chalanPhoto.uri }} style={styles.photoPreview} />
                    <Pressable style={styles.removePhotoBtn} onPress={() => setChalanPhoto(null)}>
                      <Feather name="x" size={14} color={colors.white} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.photoUploadBtn} onPress={handleCaptureChalan}>
                    <Feather name="camera" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <Text style={styles.photoUploadText}>Tap to capture or upload chalan</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={[styles.recordBtn, submitting && styles.recordBtnDisabled]} onPress={handleRecordMovement} disabled={submitting}>
                <Feather name="check-circle" size={16} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.recordBtnText}>{submitting ? "Recording..." : `Record ${scanType.toUpperCase()}`}</Text>
              </Pressable>

            </View>
          </View>

          {/* Right Column: Recent Movements */}
          <View style={styles.rightColumn}>
            <View style={styles.card}>
              
              <View style={styles.movementsHeader}>
                <Text style={styles.cardTitle}>Recent movements</Text>
                <View style={styles.headerActions}>
                  <Pressable style={styles.pdfBtn} onPress={handleExportMovementsPDF}>
                    <Feather name="file-text" size={14} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.pdfBtnText}>PDF</Text>
                  </Pressable>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
              ) : movements.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No movements found for this department.</Text>
                </View>
              ) : (
                <View>
                  {movements.map((m: any) => (
                    <View key={m.id} style={styles.movementRow}>
                      <View>
                        <Text style={styles.movementName}>{m.item_name}</Text>
                        <Text style={styles.movementDetails}>
                          {m.date} {m.reference_number ? `• Chalan: ${m.reference_number}` : ''}
                        </Text>
                        <Text style={styles.movementReason}>Loc: {m.reason}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.movementQty, m.transaction_type === 'IN' ? { color: '#10B981' } : { color: '#EF4444' }]}>
                          {m.transaction_type === 'IN' ? '+' : '-'}{m.quantity}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            </View>
          </View>
        </View>

      </ScrollView>

      {/* Full Screen Live Camera Scanner */}
      {activeScanner !== null && (
        <Modal visible={true} transparent={false} animationType="slide">
          <View style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan {activeScanner === 'item' ? 'Item' : 'Rack'} QR</Text>
              <Pressable onPress={() => setActiveScanner(null)} style={styles.closeScannerBtn}>
                <Feather name="x" size={24} color={colors.white} />
              </Pressable>
            </View>
            
            <CameraView
              style={styles.cameraFrame}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            
            <View style={styles.scannerFooter}>
              <Text style={styles.scannerInstruction}>Center the QR code inside the frame</Text>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
  headerRow: { marginBottom: spacing.lg },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  modeTabsRow: { flexDirection: "row", gap: 12, marginBottom: spacing.xl },
  modeTab: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB" },
  modeTabActive: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  modeTabText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modeTabTextActive: { color: colors.white },

  workspaceRow: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 24, alignItems: "flex-start" },
  leftColumn: { flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 480 : "100%" },
  rightColumn: { flex: 1, width: "100%" },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 400 },

  toggleRow: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: "#8B5CF6" },
  toggleBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  toggleBtnTextActive: { color: colors.white },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#111111", marginBottom: 8 },
  selectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48 },
  selectText: { fontSize: 15, color: "#111111", fontWeight: "500" },

  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 320, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10 },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },

  scanTriggerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingLeft: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, height: 48 },
  scanTriggerText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  formRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  textInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 15, color: "#111111" },

  photoUploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderStyle: "dashed", borderRadius: 12, height: 70 },
  photoUploadText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  photoPreviewContainer: { position: "relative", width: 120, height: 120 },
  photoPreview: { width: "100%", height: "100%", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  removePhotoBtn: { position: "absolute", top: -8, right: -8, backgroundColor: "#EF4444", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },

  recordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#111111", paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  recordBtnDisabled: { backgroundColor: "#9CA3AF" },
  recordBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },

  movementsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
  headerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  pdfBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pdfBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },

  movementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  movementName: { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 2 },
  movementDetails: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  movementReason: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  movementQty: { fontSize: 16, fontWeight: '800' },

  // --- Live Scanner Styles ---
  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 24, backgroundColor: "rgba(0,0,0,0.8)" },
  scannerTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  closeScannerBtn: { padding: 8 },
  cameraFrame: { flex: 1, width: "100%" },
  scannerFooter: { padding: 32, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center" },
  scannerInstruction: { color: colors.white, fontSize: 16, fontWeight: "600" }
});