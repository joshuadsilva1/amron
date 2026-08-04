import { Platform } from "react-native";
import type { DocumentPickerAsset } from "expo-document-picker";
import api from "./api";

export interface StockItem {
  id: string;
  item_code: string;
  oem_company_code: string;
  name: string;
  category: string;
  department_id: string;
  unit_of_measure: string;
  current_stock: number;
}

export default class ReportService {
  static async getLiveStock(): Promise<StockItem[]> {
    const response = await api.get<{ status: string; data: StockItem[] }>("/items/");
    return response.data.data;
  }

  // moduleType must match a department name — the backend uses it to tag
  // imported items (POST /import/excel/<module_type>).
  static async uploadExcelSheet(fileAsset: DocumentPickerAsset, moduleType: string) {
    const formData = new FormData();
    if (Platform.OS === "web") {
      // On web the asset carries a real File object — the browser's
      // FormData needs that directly. The {uri, name, type} shape below is
      // a React Native-only convention; on web it just gets stringified
      // into a text field, so the backend sees no file part.
      formData.append("file", fileAsset.file as File, fileAsset.name || "upload.xlsx");
    } else {
      formData.append("file", {
        uri: fileAsset.uri,
        name: fileAsset.name || "upload.xlsx",
        type: fileAsset.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      } as any);
    }

    // Native fetch (not axios) so the multipart boundary isn't clobbered by
    // axios's default JSON Content-Type header — same fix as the Excel
    // importer and the supplier bill upload. Token comes from the auth
    // store, NOT api.defaults, which is never actually populated.
    const useAuthStore = (await import("@/store/authStore")).default;
    const { getSession } = await import("@/utils/storage");
    let token = useAuthStore.getState().jwt;
    if (!token) token = (await getSession())?.token || null;

    const response = await fetch(`${api.defaults.baseURL}/import/excel/${encodeURIComponent(moduleType)}`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to import Excel sheet");
    return data;
  }
}