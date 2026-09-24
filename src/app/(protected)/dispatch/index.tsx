import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView, TextInput } from "react-native";
import Alert from "@/utils/alert";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import TransactionService, { BinDetails } from "@/services/transactionService";
import ClientService, { Client } from "@/services/clientService";
import AppButton from "@/components/common/AppButton";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function DispatchScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [scannedBins, setScannedBins] = useState<BinDetails[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const data = await ClientService.getClients();
      setClients(data);
      if (data.length > 0 && data[0].id) setSelectedClientId(data[0].id);
    } catch (error) {
      console.log("Error fetching clients", error);
    }
  }

  // Shared by both the camera scanner and manual entry — one bin, looked
  // up and QC-checked, added to the list if it passes.
  const addBinByCode = async (code: string) => {
    if (scannedBins.some((bin) => bin.qr_code_string === code)) return;

    try {
      const binData = await TransactionService.getBinDetails(code);

      // Dispatch Safety Net: Cannot ship unverified items
      if (binData.qc_status !== "Passed") {
        Alert.alert("Dispatch Blocked", `Bin ${code} has QC Status: ${binData.qc_status}`);
      } else {
        setScannedBins((prev) => [...prev, binData]);
      }
    } catch (error: any) {
      Alert.alert("Not Found", error?.response?.data?.error || error?.message || "Invalid QR code.");
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (processingScan) return;
    setProcessingScan(true);
    try {
      await addBinByCode(data);
    } finally {
      setTimeout(() => setProcessingScan(false), 1500);
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

  const submitDispatch = async () => {
    if (scannedBins.length === 0) {
      Alert.alert("Error", "No bins scanned for dispatch.");
      return;
    }
    if (!selectedClientId) {
      Alert.alert("Error", "Please select a destination client.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        client_id: selectedClientId,
        qr_codes: scannedBins.map((bin) => bin.qr_code_string),
      };

      const response = await TransactionService.dispatchGoods(payload);
      Alert.alert("Success", response.message || "Goods dispatched successfully.");
      
      // Reset for next truck/shipment
      setScannedBins([]);
    } catch (error: any) {
      Alert.alert("Dispatch Failed", error?.message || "Could not complete dispatch.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Outward</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable onPress={() => router.push("/(protected)/dispatch/assemble")} style={styles.historyIcon}>
            <SymbolView name="square.stack.3d.up" size={22} tintColor={colors.navy} />
          </Pressable>
          <Pressable onPress={() => router.push("/(protected)/dispatch/history")} style={styles.historyIcon}>
             <SymbolView name="clock.arrow.circlepath" size={24} tintColor={colors.navy} />
          </Pressable>
        </View>
      </View>

      {isScanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanTarget} />
            <Text style={styles.scanInstruction}>Scan Passed FG Bins</Text>
            <View style={styles.doneBtnContainer}>
               <AppButton title="Done Scanning" onPress={() => setIsScanning(false)} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.listContainer}>
          
          {/* Client Selection (Simplified as horizontal scroll for now) */}
          <View style={styles.clientSection}>
            <Text style={styles.sectionTitle}>Select Client Destination</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clientScroll}>
              {clients.map(client => (
                <Pressable 
                  key={client.id} 
                  style={[styles.clientChip, selectedClientId === client.id && styles.clientChipSelected]}
                  onPress={() => client.id && setSelectedClientId(client.id)}
                >
                  <Text style={[styles.clientChipText, selectedClientId === client.id && { color: colors.white }]}>
                    {client.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Ready to Ship: {scannedBins.length} bins</Text>
            <AppButton
              title="+ Scan Bins"
              onPress={async () => {
                if (!permission?.granted) {
                  const { granted } = await requestPermission();
                  if (!granted) {
                    Alert.alert("Camera unavailable", "You can still add bins by typing their code below.");
                    return;
                  }
                }
                setIsScanning(true);
              }}
            />
          </View>

          <View style={styles.manualAddRow}>
            <TextInput
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="or type a bin's QR code, then Add"
              placeholderTextColor={colors.secondary}
              returnKeyType="go"
              onSubmitEditing={handleAddManual}
            />
            <Pressable style={styles.manualAddBtn} onPress={handleAddManual} disabled={!manualCode.trim() || addingManual}>
              {addingManual ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.manualAddBtnText}>Add</Text>}
            </Pressable>
          </View>

          <FlatList
            data={scannedBins}
            keyExtractor={(item) => item.qr_code_string}
            renderItem={({ item }) => (
              <View style={styles.binCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.binCode}>{item.qr_code_string}</Text>
                  <Text style={styles.binName}>{item.item_name}</Text>
                  <Text style={styles.binDetails}>{item.quantity} {item.unit_of_measure}</Text>
                </View>
                <Pressable onPress={() => setScannedBins(s => s.filter(b => b.qr_code_string !== item.qr_code_string))}>
                  <SymbolView name="trash.fill" size={20} tintColor={colors.error} />
                </Pressable>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.footer}>
            <AppButton 
              title={`Dispatch ${scannedBins.length} Bins`} 
              onPress={submitDispatch} 
              loading={submitting}
              disabled={scannedBins.length === 0}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy },
  historyIcon: { padding: spacing.xs },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  permissionText: { fontSize: 16, textAlign: "center", marginBottom: 20 },
  
  cameraContainer: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: colors.success, borderRadius: 16 },
  scanInstruction: { color: "white", marginTop: 20, fontSize: 18, fontWeight: "700" },
  doneBtnContainer: { position: "absolute", bottom: 50, width: "80%" },

  listContainer: { flex: 1 },
  clientSection: { padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.secondary, marginBottom: spacing.md, textTransform: "uppercase" },
  clientScroll: { gap: spacing.sm },
  clientChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  clientChipSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  clientChipText: { fontSize: 14, fontWeight: "600", color: colors.text },

  infoBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  infoText: { fontSize: typography.h3, fontWeight: "800", color: colors.navy },

  manualAddRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  manualInput: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: colors.text },
  manualAddBtn: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 20, height: 44, alignItems: "center", justifyContent: "center" },
  manualAddBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  binCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  binCode: { fontSize: 12, color: colors.secondary, fontWeight: "600", marginBottom: 2 },
  binName: { fontSize: 16, fontWeight: "700", color: colors.navy },
  binDetails: { fontSize: 14, color: colors.primary, fontWeight: "700", marginTop: 4 },
  
  footer: { padding: spacing.lg, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border },
});