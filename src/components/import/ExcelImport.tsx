import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, Modal, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import Alert from "@/utils/alert";
import colors from "@/theme/colors";
import api from "@/services/api";
import useAuthStore from "@/store/authStore";
import { getSession } from "@/utils/storage";
import { exportToExcel } from "@/utils/export";

// Excel import, shown inside the screen it belongs to (Items, Recipes,
// Purchase Orders, Racks) rather than as a page of its own. Column names
// must match exactly what amron-api/app/api/import_api.py reads.

export type ImportModuleId = "items" | "racks" | "rack-stock" | "recipes" | "purchase-orders";

// Item templates differ by what kind of department the items live in.
type ItemTemplateKind = "parts" | "made_from" | "finished" | "raw";

const ITEM_TEMPLATES: Record<ItemTemplateKind, { label: string; hint: string; headers: string[] }> = {
  parts: {
    label: "Moulding / parts",
    hint: "Parts a department makes or buys, e.g. Moulding, Brasspart.",
    headers: ["CODE", "NAME", "MATERIAL", "UNIT"],
  },
  made_from: {
    label: "Colour / Laser",
    hint: "Items made from another part — MADE_FROM_CODE gives each its recipe (e.g. 15 laser codes all made from one knob).",
    headers: ["CODE", "NAME", "MATERIAL", "UNIT", "MADE_FROM_CODE", "MADE_FROM_QTY"],
  },
  finished: {
    label: "Finished goods",
    hint: "What clients order. CLIENT_PRODUCT_CODE is the client's code (e.g. HA 101) for this item.",
    headers: ["CODE", "NAME", "CLIENT_NAME", "CLIENT_PRODUCT_CODE", "PRICE", "BOX_QTY", "CARTON_QTY", "PCS_PER_SCAN", "UNIT"],
  },
  raw: {
    label: "Raw material",
    hint: "Powder etc. MATERIAL = White / Grey / Black.",
    headers: ["CODE", "NAME", "MATERIAL", "UNIT"],
  },
};

const MODULES: Record<ImportModuleId, {
  title: string;
  endpoint: string;
  requiresDepartment: boolean;
  description: string;
  headers?: string[];
  mergeDownColumn?: number;
}> = {
  items: {
    title: "Items",
    endpoint: "excel",
    requiresDepartment: true,
    description: "Pick the department — the template's columns match that kind of department. Existing codes are updated; blank cells leave the current value.",
  },
  recipes: {
    title: "Recipes (BOM)",
    endpoint: "recipes",
    requiresDepartment: false,
    description: "One row per component. Write FINISHED_GOOD_CODE once and leave it blank (or merged) on that product's following rows. QTY_PER_UNIT is usually 1 — use 2 when two of the same part are needed.",
    headers: ["FINISHED_GOOD_CODE", "COMPONENT_CODE", "DEPARTMENT", "QTY_PER_UNIT"],
    mergeDownColumn: 0,
  },
  "purchase-orders": {
    title: "Customer POs",
    endpoint: "purchase-orders",
    requiresDepartment: false,
    description: "One row per product. Rows with the same PO_REF (the client's PO number) become one order. FINAL_AMOUNT = QUANTITY × PER_PIECE_AMOUNT — fill either. Orders are sent to departments as soon as they're imported.",
    headers: ["PO_REF", "CLIENT_NAME", "CLIENT_PRODUCT_CODE", "COMPONENT_NAME", "QUANTITY", "PER_PIECE_AMOUNT", "FINAL_AMOUNT", "DUE_DATE", "IS_URGENT", "NOTES"],
  },
  racks: {
    title: "Racks",
    endpoint: "racks",
    requiresDepartment: true,
    description: "Bulk-create storage racks for a department. Existing rack codes are updated.",
    headers: ["CODE", "DESCRIPTION", "MAX_CAPACITY_KG"],
  },
  "rack-stock": {
    title: "Stock count",
    endpoint: "rack-stock",
    requiresDepartment: true,
    description: "Adds each row's quantity to the department's stock — same as a Scan In. Re-importing the same sheet adds again.",
    headers: ["CODE", "QTY"],
  },
};

// Which item template suits a department: top level = finished goods,
// lowest = raw material, the first production level = parts, anything
// in between (Colour, Laser) = made from another part.
function templateKindFor(dept: any, levels: number[]): ItemTemplateKind {
  if (!dept || levels.length === 0) return "parts";
  const sorted = [...levels].sort((a, b) => a - b);
  if (dept.level === sorted[sorted.length - 1]) return "finished";
  if (dept.level === sorted[0] && sorted.length > 2) return "raw";
  if (dept.level === sorted[sorted.length > 2 ? 1 : 0]) return "parts";
  return "made_from";
}

const DeptSelect = ({ value, options, onSelect }: any) => {
  const [open, setOpen] = useState(false);
  const selected = options?.find((o: any) => String(o.id) === String(value));
  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable style={styles.select} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: "#9CA3AF" }]} numberOfLines={1}>
          {selected ? selected.name : "Select department..."}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.modal, { maxWidth: 360 }]}>
            <FlatList
              data={options || []}
              keyExtractor={(d: any) => String(d.id)}
              renderItem={({ item }: any) => (
                <Pressable style={styles.option} onPress={() => { onSelect(String(item.id)); setOpen(false); }}>
                  <Text style={[styles.optionText, String(value) === String(item.id) && { color: "#8B5CF6", fontWeight: "700" }]}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// One import card: template download + department (if needed) + upload.
export function ExcelImportCard({ moduleId, departmentId, onImported }: {
  moduleId: ImportModuleId;
  departmentId?: string;
  onImported?: () => void;
}) {
  const module = MODULES[moduleId];
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptId, setDeptId] = useState(departmentId || "");
  const [kindOverride, setKindOverride] = useState<ItemTemplateKind | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (module.requiresDepartment) {
      api.get("/departments").then((r) => setDepartments(r.data?.data || [])).catch(() => setDepartments([]));
    }
  }, [module.requiresDepartment]);

  useEffect(() => {
    if (departmentId) setDeptId(departmentId);
  }, [departmentId]);

  const dept = departments.find((d) => String(d.id) === String(deptId));
  const levels: number[] = Array.from(new Set(departments.map((d) => d.level)));
  const kind: ItemTemplateKind = kindOverride || templateKindFor(dept, levels);
  const headers = moduleId === "items" ? ITEM_TEMPLATES[kind].headers : module.headers || [];

  const downloadTemplate = async () => {
    try {
      const name = moduleId === "items"
        ? `Template - ${dept ? dept.name : ITEM_TEMPLATES[kind].label} items`
        : `Template - ${module.title}`;
      await exportToExcel(name, headers, []);
    } catch (error: any) {
      Alert.alert("Download Failed", error?.message || "Could not generate the template.");
    }
  };

  const upload = async () => {
    if (module.requiresDepartment && !dept) {
      Alert.alert("Pick a department", "Select which department these rows belong to first.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const fileAsset = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      if (Platform.OS === "web") {
        formData.append("file", fileAsset.file as File, fileAsset.name || "upload.xlsx");
      } else {
        formData.append("file", {
          uri: Platform.OS === "ios" ? fileAsset.uri.replace("file://", "") : fileAsset.uri,
          name: fileAsset.name || "upload.xlsx",
          type: fileAsset.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        } as any);
      }

      let token = useAuthStore.getState().jwt;
      if (!token) {
        const session = await getSession();
        token = session?.token || null;
      }

      // Native fetch: axios would force a JSON content type and break the
      // multipart boundary.
      const baseUrl = api.defaults.baseURL;
      const url = module.requiresDepartment
        ? `${baseUrl}/import/${module.endpoint}/${encodeURIComponent(dept.name)}`
        : `${baseUrl}/import/${module.endpoint}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "", Accept: "application/json" },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const rowErrors: string[] = data.errors || [];
      Alert.alert(
        rowErrors.length ? "Imported with issues" : "Imported",
        rowErrors.length
          ? `${data.message}\n\n${rowErrors.length} row issue(s):\n${rowErrors.slice(0, 6).join("\n")}${rowErrors.length > 6 ? `\n...and ${rowErrors.length - 6} more` : ""}`
          : data.message
      );
      onImported?.();
    } catch (error: any) {
      Alert.alert("Import Failed", error?.message || "Could not process the Excel file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{module.title}</Text>
      <Text style={styles.cardText}>{module.description}</Text>

      {module.requiresDepartment && (
        <>
          <Text style={styles.label}>Department</Text>
          <DeptSelect value={deptId} options={departments} onSelect={(id: string) => { setDeptId(id); setKindOverride(null); }} />
        </>
      )}

      {moduleId === "items" && (
        <>
          <Text style={styles.label}>Template</Text>
          <View style={styles.kindRow}>
            {(Object.keys(ITEM_TEMPLATES) as ItemTemplateKind[]).map((k) => (
              <Pressable key={k} style={[styles.kindChip, kind === k && styles.kindChipActive]} onPress={() => setKindOverride(k)}>
                <Text style={[styles.kindText, kind === k && styles.kindTextActive]}>{ITEM_TEMPLATES[k].label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>{ITEM_TEMPLATES[kind].hint}</Text>
        </>
      )}

      <View style={styles.tags}>
        {headers.map((h) => (
          <View key={h} style={styles.tag}><Text style={styles.tagText}>{h}</Text></View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={downloadTemplate}>
          <Feather name="download" size={15} color="#111111" />
          <Text style={styles.secondaryText}>Download template</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, (uploading || (module.requiresDepartment && !dept)) && { backgroundColor: "#9CA3AF" }]}
          onPress={upload}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator color={colors.white} size="small" /> : (
            <>
              <Feather name="upload" size={15} color={colors.white} />
              <Text style={styles.primaryText}>Upload filled Excel</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// Header button that opens the import card(s) for this screen.
export function ExcelImportButton({ moduleIds, departmentId, onImported, label = "Import Excel" }: {
  moduleIds: ImportModuleId[];
  departmentId?: string;
  onImported?: () => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.headerBtn} onPress={() => setOpen(true)}>
        <Feather name="upload-cloud" size={15} color="#374151" />
        <Text style={styles.headerBtnText}>{label}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {moduleIds.map((id) => (
                <ExcelImportCard key={id} moduleId={id} departmentId={departmentId} onImported={onImported} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  headerBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 620, maxHeight: "90%", backgroundColor: "#F9FAFB", borderRadius: 16, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },

  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111111", marginBottom: 4 },
  cardText: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  hint: { fontSize: 12, color: "#9CA3AF", marginBottom: 10 },

  select: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, height: 44, paddingHorizontal: 12, backgroundColor: colors.white },
  selectText: { fontSize: 14, color: "#111111", flex: 1 },
  option: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: colors.white },
  optionText: { fontSize: 14, color: "#374151" },

  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  kindChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  kindChipActive: { backgroundColor: "#111111", borderColor: "#111111" },
  kindText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  kindTextActive: { color: colors.white },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: { backgroundColor: "#F3F4F6", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  tagText: { fontSize: 11, fontWeight: "700", color: "#4B5563" },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryText: { fontSize: 13, fontWeight: "600", color: "#111111" },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#8B5CF6", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  primaryText: { fontSize: 13, fontWeight: "700", color: colors.white },
});
