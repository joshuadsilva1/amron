// import React from "react";
// import { View, Text, StyleSheet, Pressable, ScrollView, Alert, useWindowDimensions } from "react-native";
// import { Feather } from "@expo/vector-icons";

// import colors from "@/theme/colors";
// import spacing from "@/theme/spacing";

// // --- Configuration Data for Import Cards ---
// const IMPORT_MODULES = [
//   {
//     id: "items",
//     title: "Items / Products",
//     description: "Finished goods, box, pouch, carton, label — with QR settings. (Use the dedicated Moulding / Brasspart templates for those.)",
//     tags: [
//       { name: "code", required: true },
//       { name: "name", required: true },
//       { name: "type", required: true },
//       { name: "category", required: false },
//       { name: "subcategory", required: false },
//       { name: "price", required: false },
//       { name: "box_qty", required: false },
//       { name: "pouch_qty", required: false },
//       { name: "carton_qty", required: false },
//       { name: "scan_qty", required: false },
//       { name: "unit", required: false },
//     ],
//     helperText: "type must be one of: finished_good, box, pouch, carton, label. unit one of: pcs, gross, dozen, kg, gram, box, carton, set, roll, pair. Rows with an existing code are updated, new codes are added. Weight (for powder) applies only to Moulding — use the Moulding template.",
//   },
//   {
//     id: "moulding",
//     title: "Moulding (with weight)",
//     description: "Moulding parts. Weight in grams is used to auto-calculate powder consumption. Powder is calculated ONLY for moulding.",
//     tags: [
//       { name: "code", required: true },
//       { name: "name", required: true },
//       { name: "category", required: false },
//       { name: "subcategory", required: false },
//       { name: "weight_grams", required: true },
//       { name: "scan_qty", required: false },
//       { name: "unit", required: false },
//     ],
//     helperText: "weight_grams is the powder weight per piece — powder need is derived from this. All rows are imported as moulding items. Existing codes are updated.",
//   },
//   {
//     id: "brasspart",
//     title: "Brasspart",
//     description: "Brass components (measured in gross). No weight / no powder calculation for brasspart.",
//     tags: [
//       { name: "code", required: true },
//       { name: "name", required: true },
//       { name: "category", required: false },
//       { name: "subcategory", required: false },
//       { name: "scan_qty", required: false },
//       { name: "unit", required: false },
//     ],
//     helperText: "All rows are imported as brasspart items (unit defaults to gross). Existing codes are updated.",
//   },
//   {
//     id: "racks",
//     title: "Racks",
//     description: "Storage racks per department (QR is auto-generated on import).",
//     tags: [
//       { name: "code", required: true },
//       { name: "area", required: false },
//       { name: "department", required: true },
//     ],
//     helperText: "department must be a valid department key (moulding, brasspart, lazer, fitting, packing, dispatch, quality, purchase, powder).",
//   },
//   {
//     id: "clients",
//     title: "Clients",
//     description: "Customers / buyers for purchase orders.",
//     tags: [
//       { name: "name", required: true },
//       { name: "contact", required: false },
//       { name: "whatsapp", required: false },
//       { name: "address", required: false },
//     ],
//     helperText: "",
//   },
//   {
//     id: "recipes",
//     title: "Recipes (BOM)",
//     description: "Which raw materials make each finished good. Add one row per component — use several rows with the same finished_good_code to include multiple mouldings and multiple brassparts in one product.",
//     tags: [
//       { name: "finished_good_code", required: true },
//       { name: "component_code", required: true },
//       { name: "qty_per_unit", required: true },
//     ],
//     helperText: "One row = one component. Repeat the same finished_good_code across rows to add multiple mouldings and multiple brassparts (and box/pouch/carton) to a single product. All codes must already exist in Items first.",
//   },
//   {
//     id: "party_products",
//     title: "Party Products (OEM)",
//     description: "Map each party's own code & packaging to your internal product. Order by party code, convert to yours.",
//     tags: [
//       { name: "party_name", required: true },
//       { name: "party_code", required: true },
//       { name: "party_product_name", required: false },
//       { name: "internal_code", required: true },
//       { name: "box_code", required: false },
//       { name: "pouch_code", required: false },
//       { name: "carton_code", required: false },
//       { name: "label_code", required: false },
//       { name: "box_qty", required: false },
//       { name: "pouch_qty", required: false },
//       { name: "carton_qty", required: false },
//     ],
//     helperText: "party_name must match an existing client. internal_code is your finished good. box/pouch/carton/label codes must be existing items of that type. Re-importing the same party + party_code updates it.",
//   }
// ];

// export default function ImportExcelPage() {
//   const { width } = useWindowDimensions();
//   const isLargeScreen = width >= 768;

//   const handleDownloadTemplate = (title: string) => {
//     Alert.alert("Download", `Downloading template for ${title}...`);
//   };

//   const handleUploadExcel = (title: string) => {
//     Alert.alert("Upload", `Opening file picker for ${title}...`);
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
//         {/* Header Section */}
//         <View style={styles.headerRow}>
//           <View style={styles.headerIconBox}>
//             <Feather name="file-text" size={24} color="#8B5CF6" />
//           </View>
//           <View style={styles.headerTextWrapper}>
//             <Text style={styles.title}>Import from Excel</Text>
//             <Text style={styles.subtitle}>
//               Download a template, fill it in Excel, then upload to import directly.
//             </Text>
//           </View>
//         </View>

//         {/* CSS Fix: Masonry / Grid Layout using explicit widths instead of flex: 1 */}
//         <View style={styles.gridContainer}>
//           {IMPORT_MODULES.map((module) => (
//             <View 
//               key={module.id} 
//               style={[
//                 styles.card, 
//                 { width: isLargeScreen ? "48%" : "100%" } // Hard lock the columns to prevent wrapping errors
//               ]}
//             >
              
//               <View style={styles.cardContent}>
//                 <Text style={styles.cardTitle}>{module.title}</Text>
//                 <Text style={styles.cardDescription}>{module.description}</Text>

//                 <View style={styles.tagsContainer}>
//                   {module.tags.map((tag, idx) => (
//                     <View key={idx} style={[styles.tagPill, tag.required ? styles.tagPillRequired : styles.tagPillOptional]}>
//                       <Text style={[styles.tagText, tag.required ? styles.tagTextRequired : styles.tagTextOptional]}>
//                         {tag.name}{tag.required ? " *" : ""}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>

//                 {module.helperText ? (
//                   <Text style={styles.helperText}>{module.helperText}</Text>
//                 ) : null}
//               </View>

//               <View style={styles.cardActions}>
//                 <Pressable style={styles.downloadBtn} onPress={() => handleDownloadTemplate(module.title)}>
//                   <Feather name="download" size={16} color="#111111" style={{ marginRight: 8 }} />
//                   <Text style={styles.downloadBtnText}>Download template</Text>
//                 </Pressable>
                
//                 <Pressable style={styles.uploadBtn} onPress={() => handleUploadExcel(module.title)}>
//                   <Feather name="upload" size={16} color={colors.white} style={{ marginRight: 8 }} />
//                   <Text style={styles.uploadBtnText}>Upload filled Excel</Text>
//                 </Pressable>
//               </View>

//             </View>
//           ))}
//         </View>

//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F9FAFB" },
//   contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
//   // Header
//   headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
//   headerIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginRight: 16 },
//   headerTextWrapper: { flex: 1 },
//   title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
//   subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

//   // Grid
//   gridContainer: { 
//     flexDirection: "row", 
//     flexWrap: "wrap", 
//     justifyContent: "space-between", // Auto-spaces the two 48% columns
//   },
//   card: { 
//     backgroundColor: colors.white, 
//     borderRadius: 16, 
//     borderWidth: 1, 
//     borderColor: "#E5E7EB", 
//     shadowColor: "#000", 
//     shadowOpacity: 0.02, 
//     shadowRadius: 10, 
//     elevation: 2, 
//     flexDirection: "column",
//     justifyContent: "space-between", // Pushes buttons to bottom
//     marginBottom: 24 // Replaces rowGap to work on all RN versions
//   },
//   cardContent: { padding: 24 },
//   cardTitle: { fontSize: 18, fontWeight: "700", color: "#111111", marginBottom: 8 },
//   cardDescription: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  
//   tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 },
//   tagPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
//   tagPillRequired: { backgroundColor: "#8B5CF6" },
//   tagPillOptional: { backgroundColor: "#F3F4F6" },
//   tagText: { fontSize: 12, fontWeight: "600" },
//   tagTextRequired: { color: colors.white },
//   tagTextOptional: { color: "#374151" },

//   helperText: { fontSize: 13, color: "#6B7280", lineHeight: 18, marginTop: 4 },

//   cardActions: { padding: 24, paddingTop: 0, gap: 12 },
//   downloadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
//   downloadBtnText: { fontSize: 14, fontWeight: "600", color: "#111111" },
  
//   uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#8B5CF6" },
//   uploadBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
// });


import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, useWindowDimensions, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import useAuthStore from "@/store/authStore";
import { getSession } from "@/utils/storage";
import SupplierOrderService from "@/services/supplierService";
import { exportToExcel, ExportCell } from "@/utils/export";

// Same modal-dropdown pattern used elsewhere (supplier-order.tsx).
const SelectInput = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable style={styles.deptInputBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.deptInputText, !selectedOption && styles.deptPlaceholderText]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
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

const IMPORT_MODULES = [
  {
    id: "items",
    endpoint: "excel",
    requiresDepartment: true,
    title: "Items / Products",
    description: "Any item type — pick the department it belongs to, the sheet does the rest.",
    tags: [
      { name: "CODE", required: true },
      { name: "DECCRPTION", required: true },
      { name: "MATERIAL", required: false },
      { name: "UNIT", required: false },
      { name: "PRICE", required: false },
      { name: "BOX_QTY", required: false },
      { name: "CARTON_QTY", required: false },
      { name: "PCS_PER_SCAN", required: false },
      { name: "REORDER_LEVEL", required: false },
      { name: "OEM_COMPANY_CODE", required: false },
    ],
    helperText: "Automatically extracts category series (e.g., F1) from the code prefix. Existing codes are updated — blank optional cells leave the current value untouched. UNIT must be one of: pcs, gross, dozen, kg, gram, box, carton, set, roll, pair.",
  },
  {
    id: "racks",
    endpoint: "racks",
    requiresDepartment: true,
    title: "Racks",
    description: "Bulk-create storage racks for a department.",
    tags: [{ name: "CODE", required: true }, { name: "DESCRIPTION", required: false }, { name: "MAX_CAPACITY_KG", required: false }],
    helperText: "Existing rack codes are updated (re-assigned to the selected department).",
  },
  {
    id: "rack-stock",
    endpoint: "rack-stock",
    requiresDepartment: true,
    title: "Rack Stock",
    description: "Bulk stock-in items into a department, e.g. from a physical count.",
    tags: [{ name: "CODE", required: true }, { name: "QTY", required: true }],
    helperText: "Adds the sheet's quantity to existing stock — same as a manual Stock In. Re-importing the same sheet adds again.",
  },
  {
    id: "recipes",
    endpoint: "recipes",
    requiresDepartment: false,
    title: "Recipes (BOM)",
    description: "Which components make each finished good. No department picker here — each row carries its own DEPARTMENT, since one recipe's components can come from several departments.",
    tags: [
      { name: "FINISHED_GOOD_CODE", required: true },
      { name: "COMPONENT_CODE", required: true },
      { name: "DEPARTMENT", required: false },
      { name: "QTY_PER_UNIT", required: true },
      { name: "LAZER_NEEDED", required: false },
      { name: "COLOUR_NEEDED", required: false },
      { name: "WASTAGE_PERCENT", required: false },
    ],
    helperText: "One row = one component. List a FINISHED_GOOD_CODE once and merge its cell down across all of that product's component rows (repeating the code on every row works too). Every COMPONENT_CODE must already exist under Items. DEPARTMENT is the department that component is drawn from — leave it blank to use the item's own department; it must match the item's department if it already has one, and is assigned if it has none. WASTAGE_PERCENT can only be set by an Admin; other roles leave it blank to keep the current value.",
  },
  {
    id: "purchase-orders",
    endpoint: "purchase-orders",
    requiresDepartment: false,
    title: "Purchase Orders",
    description: "Bulk-enter client POs — one row per line item. Department isn't a column either: each CLIENT_PRODUCT_CODE resolves to an internal product, and its department is reported back with the import result.",
    tags: [
      { name: "PO_REF", required: true },
      { name: "CLIENT_NAME", required: true },
      { name: "CLIENT_PRODUCT_CODE", required: true },
      { name: "QUANTITY", required: true },
      { name: "DUE_DATE", required: false },
      { name: "CHALLAN_NUMBER", required: false },
      { name: "IS_URGENT", required: false },
      { name: "NOTES", required: false },
    ],
    helperText: "One row = one line item. Repeat the same PO_REF across rows to group them into a single PO (only needs to be filled on one row per group). CLIENT_NAME must match an existing client, and CLIENT_PRODUCT_CODE must already be mapped under Party Products (OEM).",
  },
];

// Column headers here must match exactly what amron-api/app/api/import_api.py
// reads for each endpoint, so a filled-in template is guaranteed to import
// cleanly. Department is picked from the dropdown below, not a sheet column,
// so the same template works for every department.
const TEMPLATE_DATA: Record<string, { headers: string[]; rows: ExportCell[][]; mergeDownColumn?: number }> = {
  items: {
    headers: ["CODE", "DECCRPTION", "MATERIAL", "UNIT", "PRICE", "BOX_QTY", "CARTON_QTY", "PCS_PER_SCAN", "REORDER_LEVEL", "OEM_COMPANY_CODE"],
    rows: [
      ["F1 1001 MA", "FLAT 1WAY SWITCH BASE", "PC WHITE", "pcs", 4.5, 100, 20, 1, 500, ""],
      ["F2 1101 MA", "ROCKER 1 WAY SWITCH BASE", "PC WHITE", "pcs", 6.25, 50, 10, 1, 250, ""],
    ],
  },
  racks: {
    headers: ["CODE", "DESCRIPTION", "MAX_CAPACITY_KG"],
    rows: [
      ["RACK-A1", "Raw Material Storage - Aisle 1", 500],
      ["RACK-A2", "Raw Material Storage - Aisle 2", 500],
    ],
  },
  "rack-stock": {
    headers: ["CODE", "QTY"],
    rows: [
      ["F1 1001 MA", 250],
      ["F2 1101 MA", 100],
    ],
  },
  recipes: {
    headers: ["FINISHED_GOOD_CODE", "COMPONENT_CODE", "DEPARTMENT", "QTY_PER_UNIT", "LAZER_NEEDED", "COLOUR_NEEDED", "WASTAGE_PERCENT"],
    // Finished good is written once and merged down its component rows —
    // the importer treats a blank/merged cell as "same finished good as above".
    rows: [
      ["F1 1001 FG", "F1 1001 MA", "Moulding", 1, "N", "N", ""],
      ["", "BRS-2001", "Brasspart", 2, "Y", "N", ""],
    ],
    mergeDownColumn: 0,
  },
  "purchase-orders": {
    headers: ["PO_REF", "CLIENT_NAME", "CLIENT_PRODUCT_CODE", "QUANTITY", "DUE_DATE", "CHALLAN_NUMBER", "IS_URGENT", "NOTES"],
    rows: [
      ["PO-1001", "Acme Switchgear", "HA101", 500, "2026-10-15", "CH-4521", "N", ""],
      ["PO-1001", "", "HA102", 200, "", "", "", ""],
    ],
  },
};

// Merges a column's non-blank cell down across the blank cells beneath it
// (+1 on the row because the header occupies sheet row 0).
function templateMerges(template: { rows: ExportCell[][]; mergeDownColumn?: number }) {
  const col = template.mergeDownColumn;
  if (col === undefined) return undefined;
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let start = -1;
  const isBlank = (v: ExportCell) => v === "" || v === null || v === undefined;
  template.rows.forEach((row, i) => {
    if (!isBlank(row[col])) {
      if (start >= 0 && i - 1 > start) merges.push({ s: { r: start + 1, c: col }, e: { r: i, c: col } });
      start = i;
    }
  });
  if (start >= 0 && template.rows.length - 1 > start) {
    merges.push({ s: { r: start + 1, c: col }, e: { r: template.rows.length, c: col } });
  }
  return merges;
}

export default function ImportExcelPage() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [uploadingModule, setUploadingModule] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Record<string, string>>({});

  useEffect(() => {
    SupplierOrderService.getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  const handleDownloadTemplate = async (module: typeof IMPORT_MODULES[number]) => {
    const template = TEMPLATE_DATA[module.id];
    if (!template) {
      Alert.alert("Error", "No template is defined for this import type yet.");
      return;
    }
    try {
      await exportToExcel(`Import Template - ${module.title}`, template.headers, template.rows, templateMerges(template));
    } catch (error: any) {
      Alert.alert("Download Failed", error.message || "Could not generate the template.");
    }
  };

  const handleUploadExcel = async (module: typeof IMPORT_MODULES[number]) => {
    let department: any = null;
    if (module.requiresDepartment) {
      department = departments.find((d) => String(d.id) === String(selectedDeptIds[module.id]));
      if (!department) {
        Alert.alert("Error", "Please select a department first.");
        return;
      }
    }
    const moduleId = module.id;
    const title = module.title;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv"
        ],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const fileAsset = result.assets[0];
      setUploadingModule(moduleId);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        // On web the asset carries a real File object — the browser's
        // FormData needs that directly. The {uri, name, type} shape below
        // is a React Native-only convention; on web it just gets
        // stringified into a text field, so the backend sees no file part.
        formData.append("file", fileAsset.file as File, fileAsset.name || "upload.xlsx");
      } else {
        formData.append("file", {
          uri: Platform.OS === 'ios' ? fileAsset.uri.replace('file://', '') : fileAsset.uri,
          name: fileAsset.name || "upload.xlsx",
          type: fileAsset.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        } as any);
      }

      // Grab the real auth token the same way the rest of the app does —
      // api.defaults.headers is never actually populated (the token is
      // attached per-request by an interceptor), so reading it here always
      // returned an empty string and silently sent no Authorization header.
      let token = useAuthStore.getState().jwt;
      if (!token) {
        const session = await getSession();
        token = session?.token || null;
      }

      // Use native fetch (axios would force a JSON Content-Type that breaks
      // the multipart boundary for file uploads)
      const baseUrl = api.defaults.baseURL;
      const uploadUrl = module.requiresDepartment
        ? `${baseUrl}/import/${module.endpoint}/${encodeURIComponent(department.name)}`
        : `${baseUrl}/import/${module.endpoint}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json',
        },
        body: formData,
      });

      const responseData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(responseData.error || 'Upload failed');
      }

      const rowErrors: string[] = responseData.errors || [];
      const summary = rowErrors.length
        ? `${responseData.message}\n\n${rowErrors.length} row issue(s):\n${rowErrors.slice(0, 5).join("\n")}${rowErrors.length > 5 ? `\n...and ${rowErrors.length - 5} more` : ""}`
        : responseData.message || `Successfully imported ${title}!`;
      Alert.alert("Success", summary);
    } catch (error: any) {
      console.error("Import error:", error);
      Alert.alert("Import Failed", error.message || "Could not process the Excel file.");
    } finally {
      setUploadingModule(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <Feather name="file-text" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.title}>Import from Excel</Text>
            <Text style={styles.subtitle}>
              Upload filled Excel sheets (like your Moulding codes) to ingest data instantly.
            </Text>
          </View>
        </View>

        {/* Grid Layout */}
        <View style={styles.gridContainer}>
          {IMPORT_MODULES.map((module) => {
            const isThisLoading = uploadingModule === module.id;
            const selectedDeptId = selectedDeptIds[module.id] || "";
            return (
              <View
                key={module.id}
                style={[
                  styles.card,
                  { width: isLargeScreen ? "48%" : "100%" }
                ]}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{module.title}</Text>
                  <Text style={styles.cardDescription}>{module.description}</Text>

                  <View style={styles.tagsContainer}>
                    {module.tags.map((tag, idx) => (
                      <View key={idx} style={[styles.tagPill, tag.required ? styles.tagPillRequired : styles.tagPillOptional]}>
                        <Text style={[styles.tagText, tag.required ? styles.tagTextRequired : styles.tagTextOptional]}>
                          {tag.name}{tag.required ? " *" : ""}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {module.helperText ? (
                    <Text style={styles.helperText}>{module.helperText}</Text>
                  ) : null}

                  {module.requiresDepartment && (
                    <>
                      <Text style={styles.deptLabel}>Department</Text>
                      <SelectInput
                        placeholder="Select department..."
                        value={selectedDeptId}
                        options={departments}
                        onSelect={(id: string) => setSelectedDeptIds((prev) => ({ ...prev, [module.id]: id }))}
                      />
                    </>
                  )}
                </View>

                <View style={styles.cardActions}>
                  <Pressable style={styles.downloadBtn} onPress={() => handleDownloadTemplate(module)}>
                    <Feather name="download" size={16} color="#111111" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadBtnText}>Download template</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.uploadBtn, (isThisLoading || (module.requiresDepartment && !selectedDeptId)) && { backgroundColor: "#9CA3AF" }]}
                    onPress={() => handleUploadExcel(module)}
                    disabled={isThisLoading || (module.requiresDepartment && !selectedDeptId)}
                  >
                    {isThisLoading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Feather name="upload" size={16} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={styles.uploadBtnText}>Upload filled Excel</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
  headerIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginRight: 16 },
  headerTextWrapper: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, flexDirection: "column", justifyContent: "space-between", marginBottom: 24 },
  cardContent: { padding: 24 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111111", marginBottom: 8 },
  cardDescription: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 },
  tagPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  tagPillRequired: { backgroundColor: "#8B5CF6" },
  tagPillOptional: { backgroundColor: "#F3F4F6" },
  tagText: { fontSize: 12, fontWeight: "600" },
  tagTextRequired: { color: colors.white },
  tagTextOptional: { color: "#374151" },

  helperText: { fontSize: 13, color: "#6B7280", lineHeight: 18, marginTop: 4 },

  cardActions: { padding: 24, paddingTop: 0, gap: 12 },
  downloadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  downloadBtnText: { fontSize: 14, fontWeight: "600", color: "#111111" },
  
  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#8B5CF6" },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },

  deptLabel: { fontSize: 13, fontWeight: "600", color: "#111111", marginTop: 4, marginBottom: 6 },
  deptInputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44 },
  deptInputText: { fontSize: 15, color: "#111111", flex: 1 },
  deptPlaceholderText: { color: "#9CA3AF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden" },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" },
});