import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";

import TransactionService, { BinDetails } from "@/services/transactionService";
import QCTemplateService, { QCTemplateSummary, QCTemplateDetail, QCObservationInput } from "@/services/qcTemplateService";
import useAuthStore from "@/store/authStore";
import DropTestPhotos from "@/components/common/DropTestPhotos";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

type ObservationState = Record<string, { result: "Pass" | "Fail" | "NA"; remark: string }>;

const RESULT_COLORS: Record<string, string> = {
  Pass: "#10B981",
  Fail: "#EF4444",
  NA: "#9CA3AF",
};

const humanizeFieldName = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const observationKey = (checkpointId: string, entryLabel: string) => `${checkpointId}::${entryLabel}`;

export default function QCInspectionScreen() {
  const user = useAuthStore((s) => s.user);
  const [permission, requestPermission] = useCameraPermissions();

  const [qrCode, setQrCode] = useState("");
  const [binData, setBinData] = useState<BinDetails | null>(null);
  const [loadingBin, setLoadingBin] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [candidateTemplates, setCandidateTemplates] = useState<QCTemplateSummary[]>([]);
  const [templateDetail, setTemplateDetail] = useState<QCTemplateDetail | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const [headerData, setHeaderData] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<ObservationState>({});
  const [overallResult, setOverallResult] = useState<"Approved" | "Approved_With_Observation" | "Rejected" | null>(null);
  const [overallRemarks, setOverallRemarks] = useState("");
  const [dropTestPhoto1, setDropTestPhoto1] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [dropTestPhoto2, setDropTestPhoto2] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetInspection = () => {
    setCandidateTemplates([]);
    setTemplateDetail(null);
    setHeaderData({});
    setObservations({});
    setOverallResult(null);
    setOverallRemarks("");
    setDropTestPhoto1(null);
    setDropTestPhoto2(null);
  };

  const fetchBin = async (code: string) => {
    if (!code.trim()) {
      Alert.alert("Error", "Please scan or enter a QR code.");
      return;
    }
    try {
      setLoadingBin(true);
      resetInspection();
      const data = await TransactionService.getBinDetails(code.trim());
      setBinData(data);

      const templates = await QCTemplateService.getTemplates({ category: data.category });
      setCandidateTemplates(templates);
      if (templates.length === 1) {
        await selectTemplate(templates[0].id);
      }
    } catch (error: any) {
      Alert.alert("Not Found", error?.response?.data?.error || "Could not find bin details.");
      setBinData(null);
    } finally {
      setLoadingBin(false);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan QR codes.");
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setIsScanning(false);
    setQrCode(data);
    fetchBin(data);
  };

  const selectTemplate = async (templateId: string) => {
    try {
      setLoadingTemplate(true);
      const detail = await QCTemplateService.getTemplate(templateId);
      setTemplateDetail(detail);
      setHeaderData({});
      setObservations({});
      setOverallResult(null);
      setOverallRemarks("");
    } catch (error: any) {
      Alert.alert("Error", "Could not load that template.");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const setObservation = (checkpointId: string, entryLabel: string, result: "Pass" | "Fail" | "NA") => {
    const key = observationKey(checkpointId, entryLabel);
    setObservations((prev) => ({
      ...prev,
      [key]: { result, remark: prev[key]?.remark || "" },
    }));
  };

  const setRemark = (checkpointId: string, entryLabel: string, remark: string) => {
    const key = observationKey(checkpointId, entryLabel);
    setObservations((prev) => ({
      ...prev,
      [key]: { result: prev[key]?.result || "NA", remark },
    }));
  };

  const summary = React.useMemo(() => {
    const values = Object.values(observations);
    return {
      answered: values.length,
      passed: values.filter((o) => o.result === "Pass").length,
      failed: values.filter((o) => o.result === "Fail").length,
      na: values.filter((o) => o.result === "NA").length,
    };
  }, [observations]);

  const handleSubmit = async () => {
    if (!templateDetail || !binData) return;
    if (!overallResult) {
      Alert.alert("Error", "Please select a final decision (Approved / Approved with Observation / Rejected).");
      return;
    }
    if (!dropTestPhoto1 || !dropTestPhoto2) {
      Alert.alert("Drop Test Photos Required", "Please attach both drop test photos before submitting.");
      return;
    }

    const observationList: QCObservationInput[] = [];
    for (const section of templateDetail.sections) {
      for (const checkpoint of section.checkpoints) {
        for (const entryLabel of checkpoint.entry_labels) {
          const entry = observations[observationKey(checkpoint.id, entryLabel)];
          if (!entry) continue;
          if (entry.result === "Fail" && !entry.remark.trim()) {
            Alert.alert("Remark Required", `"${checkpoint.check_point}" (${entryLabel}) is marked Fail — a remark is required.`);
            return;
          }
          observationList.push({
            checkpoint_id: checkpoint.id,
            entry_label: entryLabel,
            result: entry.result,
            remark: entry.remark || undefined,
          });
        }
      }
    }

    try {
      setSubmitting(true);
      const result = await QCTemplateService.submitInspection({
        template_id: templateDetail.id,
        reference_type: "BIN",
        qr_code_string: binData.qr_code_string,
        header_data: headerData,
        inspector_name: user?.name || "QC Inspector",
        overall_result: overallResult,
        overall_remarks: overallRemarks || undefined,
        observations: observationList,
      });

      try {
        await QCTemplateService.uploadDropTestPhotos(result.id, dropTestPhoto1, dropTestPhoto2);
      } catch (photoError: any) {
        Alert.alert("Note", "Inspection recorded, but the drop test photos failed to upload: " + (photoError.message || "Unknown error"));
      }

      Alert.alert("Success", `Bin ${binData.qr_code_string} inspection recorded as ${overallResult.replace(/_/g, " ")}.`);

      setQrCode("");
      setBinData(null);
      resetInspection();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to submit inspection.");
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
          <Text style={styles.scanInstruction}>Center the bin's QR code inside the frame</Text>
          <Pressable style={styles.doneBtn} onPress={() => setIsScanning(false)}>
            <Text style={styles.doneBtnText}>Cancel</Text>
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
            <Text style={styles.title}>Quality Control</Text>
            <Text style={styles.subtitle}>Scan a bin's QR code to inspect it against its product's QC template.</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <View style={[styles.tabBtn, styles.tabBtnActive]}>
            <Text style={[styles.tabBtnText, styles.tabBtnTextActive]}>Bin Inspection</Text>
          </View>
          <Pressable style={styles.tabBtn} onPress={() => router.push("/(protected)/quality/iqc")}>
            <Text style={styles.tabBtnText}>Incoming Material (IQC)</Text>
          </Pressable>
        </View>

        {/* Scan block */}
        <View style={styles.card}>
          <Pressable style={styles.scanBtn} onPress={openScanner}>
            <Feather name="camera" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.scanBtnText}>Scan bin QR code</Text>
          </Pressable>

          <View style={styles.manualEntryRow}>
            <TextInput
              style={styles.manualInput}
              value={qrCode}
              onChangeText={setQrCode}
              placeholder="or type the code manually..."
              placeholderTextColor="#9CA3AF"
            />
            <Pressable style={styles.fetchBtn} onPress={() => fetchBin(qrCode)} disabled={loadingBin}>
              {loadingBin ? <ActivityIndicator color={colors.white} size="small" /> : <Feather name="search" size={18} color={colors.white} />}
            </Pressable>
          </View>
        </View>

        {binData && (
          <>
            {/* Bin Info Card */}
            <View style={styles.card}>
              <View style={styles.infoHeader}>
                <View style={styles.deptBadge}>
                  <Text style={styles.deptBadgeText}>{binData.current_department}</Text>
                </View>
                <View style={[styles.qcBadge, binData.qc_status === "Passed" ? styles.qcPassed : styles.qcPending]}>
                  <Text style={[styles.qcBadgeText, { color: binData.qc_status === "Passed" ? "#10B981" : "#D97706" }]}>
                    Current: {binData.qc_status}
                  </Text>
                </View>
              </View>
              <Text style={styles.binName}>{binData.item_name}</Text>
              <Text style={styles.binDetails}>
                {binData.quantity} {binData.unit_of_measure} · {binData.qr_code_string} · {binData.category}
              </Text>
            </View>

            {candidateTemplates.length === 0 && (
              <View style={styles.emptyTemplateBox}>
                <Feather name="alert-triangle" size={18} color="#92400E" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTemplateText}>
                  No QC template is configured for category "{binData.category}". Ask an admin to create one.
                </Text>
              </View>
            )}

            {candidateTemplates.length > 1 && (
              <View style={styles.templatePickerRow}>
                {candidateTemplates.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.templateChip, templateDetail?.id === t.id && styles.templateChipSelected]}
                    onPress={() => selectTemplate(t.id)}
                  >
                    <Text style={[styles.templateChipText, templateDetail?.id === t.id && styles.templateChipTextSelected]}>
                      {t.name} ({t.qc_type})
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {loadingTemplate && <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 24 }} />}

            {templateDetail && (
              <>
                {templateDetail.header_fields.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{templateDetail.name}</Text>
                    {templateDetail.header_fields.map((field) => (
                      <View key={field} style={styles.formGroup}>
                        <Text style={styles.label}>{humanizeFieldName(field)}</Text>
                        <TextInput
                          style={styles.textInput}
                          value={headerData[field] || ""}
                          onChangeText={(text) => setHeaderData((prev) => ({ ...prev, [field]: text }))}
                          placeholder={humanizeFieldName(field)}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    ))}
                  </View>
                )}

                {templateDetail.sections.map((section) => (
                  <View key={section.id} style={styles.card}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>

                    {section.checkpoints.map((checkpoint) => (
                      <View key={checkpoint.id} style={styles.checkpointBlock}>
                        <Text style={styles.checkpointText}>
                          {checkpoint.serial_no ? `${checkpoint.serial_no}. ` : ""}{checkpoint.check_point}
                        </Text>
                        {checkpoint.standard_criteria && (
                          <Text style={styles.standardText}>{checkpoint.standard_criteria}</Text>
                        )}

                        {checkpoint.entry_labels.map((entryLabel) => {
                          const key = observationKey(checkpoint.id, entryLabel);
                          const entry = observations[key];
                          return (
                            <View key={entryLabel} style={styles.entryRow}>
                              <Text style={styles.entryLabel}>{entryLabel}</Text>
                              <View style={styles.entryToggles}>
                                {(["Pass", "Fail", "NA"] as const).map((r) => (
                                  <Pressable
                                    key={r}
                                    style={[
                                      styles.entryToggleBtn,
                                      entry?.result === r && { backgroundColor: RESULT_COLORS[r], borderColor: RESULT_COLORS[r] },
                                    ]}
                                    onPress={() => setObservation(checkpoint.id, entryLabel, r)}
                                  >
                                    <Text style={[styles.entryToggleText, entry?.result === r && { color: colors.white }]}>{r}</Text>
                                  </Pressable>
                                ))}
                              </View>
                              {entry?.result === "Fail" && (
                                <TextInput
                                  style={styles.remarkInput}
                                  value={entry.remark}
                                  onChangeText={(text) => setRemark(checkpoint.id, entryLabel, text)}
                                  placeholder="Remark required for a Fail..."
                                  placeholderTextColor="#9CA3AF"
                                  multiline
                                />
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>Answered: {summary.answered}</Text>
                  <Text style={[styles.summaryText, { color: "#10B981" }]}>Pass: {summary.passed}</Text>
                  <Text style={[styles.summaryText, { color: "#EF4444" }]}>Fail: {summary.failed}</Text>
                  <Text style={[styles.summaryText, { color: "#6B7280" }]}>N/A: {summary.na}</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Final Decision</Text>
                  <View style={styles.decisionRow}>
                    <Pressable
                      style={[styles.decisionBtn, overallResult === "Approved" && styles.btnApproved]}
                      onPress={() => setOverallResult("Approved")}
                    >
                      <Feather name="check-circle" size={18} color={overallResult === "Approved" ? colors.white : "#10B981"} />
                      <Text style={[styles.decisionText, overallResult === "Approved" && { color: colors.white }]}>Approved</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.decisionBtn, overallResult === "Approved_With_Observation" && styles.btnObservation]}
                      onPress={() => setOverallResult("Approved_With_Observation")}
                    >
                      <Feather name="alert-triangle" size={18} color={overallResult === "Approved_With_Observation" ? colors.white : "#D97706"} />
                      <Text style={[styles.decisionText, overallResult === "Approved_With_Observation" && { color: colors.white }]}>With Observation</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.decisionBtn, overallResult === "Rejected" && styles.btnRejected]}
                      onPress={() => setOverallResult("Rejected")}
                    >
                      <Feather name="x-circle" size={18} color={overallResult === "Rejected" ? colors.white : "#EF4444"} />
                      <Text style={[styles.decisionText, overallResult === "Rejected" && { color: colors.white }]}>Rejected</Text>
                    </Pressable>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Overall Remarks</Text>
                    <TextInput
                      style={styles.remarkInput}
                      value={overallRemarks}
                      onChangeText={setOverallRemarks}
                      placeholder="Any overall notes..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <DropTestPhotos
                      photo1={dropTestPhoto1}
                      photo2={dropTestPhoto2}
                      onChange1={setDropTestPhoto1}
                      onChange2={setDropTestPhoto2}
                    />
                  </View>

                  <Pressable
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    <Text style={styles.submitBtnText}>{submitting ? "Submitting..." : "Submit Inspection"}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
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

  tabsRow: { flexDirection: "row", gap: 12, marginBottom: spacing.lg },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB" },
  tabBtnActive: { backgroundColor: "#111111", borderColor: "#111111" },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabBtnTextActive: { color: colors.white },

  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: spacing.lg },

  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  scanBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },

  manualEntryRow: { flexDirection: "row", gap: 10 },
  manualInput: { flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },
  fetchBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },

  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  deptBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  deptBadgeText: { fontSize: 12, fontWeight: "700", color: "#111111" },
  qcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  qcBadgeText: { fontSize: 12, fontWeight: "700" },
  qcPassed: { backgroundColor: "#DCFCE7" },
  qcPending: { backgroundColor: "#FEF9C3" },
  binName: { fontSize: 18, fontWeight: "700", color: "#111111", marginBottom: 4 },
  binDetails: { fontSize: 13, color: "#6B7280" },

  emptyTemplateBox: { backgroundColor: "#FEF3C7", padding: 20, borderRadius: 12, marginBottom: spacing.lg },
  emptyTemplateText: { color: "#92400E", fontSize: 14, lineHeight: 20 },

  templatePickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  templateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB" },
  templateChipSelected: { backgroundColor: "#111111", borderColor: "#111111" },
  templateChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  templateChipTextSelected: { color: colors.white },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  textInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },

  checkpointBlock: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  checkpointText: { fontSize: 14, fontWeight: "600", color: "#111111", marginBottom: 4 },
  standardText: { fontSize: 12, color: "#6B7280", fontStyle: "italic", marginBottom: 8, lineHeight: 17 },

  entryRow: { marginTop: 10 },
  entryLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  entryToggles: { flexDirection: "row", gap: 8 },
  entryToggleBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: colors.white },
  entryToggleText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  remarkInput: { marginTop: 8, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 14, color: "#111111", minHeight: 44, textAlignVertical: "top" },

  summaryRow: { flexDirection: "row", gap: 20, backgroundColor: colors.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.lg },
  summaryText: { fontSize: 13, fontWeight: "700", color: "#111111" },

  decisionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  decisionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.white, borderWidth: 2, borderColor: "#E5E7EB" },
  decisionText: { fontSize: 12, fontWeight: "800", color: "#111111" },
  btnApproved: { backgroundColor: "#10B981", borderColor: "#10B981" },
  btnObservation: { backgroundColor: "#D97706", borderColor: "#D97706" },
  btnRejected: { backgroundColor: "#EF4444", borderColor: "#EF4444" },

  submitBtn: { backgroundColor: "#111111", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  submitBtnDisabled: { backgroundColor: "#9CA3AF" },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },

  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerOverlay: { justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", padding: 24 },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: "#8B5CF6", borderRadius: 16 },
  scanInstruction: { color: colors.white, marginTop: 20, fontSize: 16, fontWeight: "700", textAlign: "center" },
  doneBtn: { position: "absolute", bottom: 50, backgroundColor: colors.white, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#111111" },
});
