import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import api from "@/services/api";
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

// Same modal-dropdown pattern used elsewhere.
const SelectInput = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View>
      <Pressable style={styles.textInput} onPress={() => setModalVisible(true)}>
        <Text style={[styles.selectText, !selectedOption && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            {(!options || options.length === 0) ? (
              <Text style={styles.dropdownEmptyText}>No options available.</Text>
            ) : (
              <FlatList
                data={options}
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
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function IQCInspectionScreen() {
  const user = useAuthStore((s) => s.user);

  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState<QCTemplateSummary[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDetail, setTemplateDetail] = useState<QCTemplateDetail | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");

  const [headerData, setHeaderData] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<ObservationState>({});
  const [overallResult, setOverallResult] = useState<"Approved" | "Approved_With_Observation" | "Rejected" | null>(null);
  const [overallRemarks, setOverallRemarks] = useState("");
  const [dropTestPhoto1, setDropTestPhoto1] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [dropTestPhoto2, setDropTestPhoto2] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTemplates(true);
        const [templatesData, itemsRes] = await Promise.all([
          QCTemplateService.getTemplates({ qc_type: "IQC" }),
          api.get("/items"),
        ]);
        setTemplates(templatesData);
        setItems(itemsRes.data?.data || []);
      } catch (error) {
        console.warn("Failed to load IQC data:", error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setHeaderData({});
    setObservations({});
    setOverallResult(null);
    setOverallRemarks("");
    setSelectedItemId("");
    setDropTestPhoto1(null);
    setDropTestPhoto2(null);
  };

  const selectTemplate = async (templateId: string) => {
    try {
      setSelectedTemplateId(templateId);
      setLoadingTemplate(true);
      resetForm();
      const detail = await QCTemplateService.getTemplate(templateId);
      setTemplateDetail(detail);
    } catch (error: any) {
      Alert.alert("Error", "Could not load that template.");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Best-effort: raw materials matching this template's category, so the
  // dropdown isn't the entire catalog — falls back to everything if there's
  // no match (item categories aren't always curated to material names).
  const itemOptions = React.useMemo(() => {
    if (!templateDetail?.category) return items;
    const matches = items.filter(
      (i) => (i.category || "").trim().toLowerCase() === templateDetail.category!.trim().toLowerCase()
    );
    return matches.length > 0 ? matches : items;
  }, [items, templateDetail]);

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
    if (!templateDetail) return;
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
        reference_type: "SUPPLIER_DELIVERY",
        item_id: selectedItemId || undefined,
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

      Alert.alert("Success", `${templateDetail.name} inspection recorded as ${overallResult.replace(/_/g, " ")}.`);

      setSelectedTemplateId("");
      setTemplateDetail(null);
      resetForm();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to submit inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Quality Control</Text>
            <Text style={styles.subtitle}>Inspect an incoming raw-material delivery before it enters stock.</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <Pressable style={styles.tabBtn} onPress={() => router.push("/(protected)/quality")}>
            <Text style={styles.tabBtnText}>Bin Inspection</Text>
          </Pressable>
          <View style={[styles.tabBtn, styles.tabBtnActive]}>
            <Text style={[styles.tabBtnText, styles.tabBtnTextActive]}>Incoming Material (IQC)</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Material</Text>
          {loadingTemplates ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <SelectInput
              placeholder="Select material (IQC template)..."
              value={selectedTemplateId}
              options={templates}
              onSelect={selectTemplate}
            />
          )}
          {!loadingTemplates && templates.length === 0 && (
            <Text style={styles.helperText}>No IQC templates configured yet.</Text>
          )}
        </View>

        {loadingTemplate && <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 24 }} />}

        {templateDetail && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{templateDetail.name}</Text>

              <Text style={styles.label}>Link to catalog item (optional)</Text>
              <SelectInput
                placeholder="Select item..."
                value={selectedItemId}
                options={itemOptions.map((i) => ({ id: i.id, name: `${i.name} (${i.item_code})` }))}
                onSelect={setSelectedItemId}
              />

              {templateDetail.header_fields.map((field) => (
                <View key={field} style={styles.formGroup}>
                  <Text style={styles.label}>{humanizeFieldName(field)}</Text>
                  <TextInput
                    style={styles.plainInput}
                    value={headerData[field] || ""}
                    onChangeText={(text) => setHeaderData((prev) => ({ ...prev, [field]: text }))}
                    placeholder={humanizeFieldName(field)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}
            </View>

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

  helperText: { fontSize: 13, color: "#9CA3AF", marginTop: 8 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  plainInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },

  textInput: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, marginBottom: 16 },
  selectText: { fontSize: 15, color: "#111111", flex: 1 },

  dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", elevation: 10, maxHeight: "60%" },
  dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#111111", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownEmptyText: { padding: 20, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151", flex: 1 },

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
});
