import { Platform } from "react-native";
import api from "./api";

export interface BinDetails {
  qr_code_string: string;
  item_name: string;
  item_code: string;
  category: string;
  quantity: number;
  unit_of_measure: string;
  current_department: string;
  qc_status: string;
  is_active: boolean;
}

export interface ScannerTransferPayload {
  from_department_id: string;
  to_department_id: string;
  qr_codes: string[];
  user_name: string;
}

export interface ManualTransactionPayload {
  product_id: string;
  transaction_type: "IN" | "OUT";
  quantity: number;
  department_id: string;
  reason: string;
  reference_number?: string;
  user_name?: string;
}

export interface ChallanHistoryEntry {
  challan_number: string;
  movement_type: string;
  origin: string;
  destination: string;
  created_by: string;
  timestamp: string;
  items: { item_name: string; item_code: string; quantity: number }[];
}

export interface DepartmentTransaction {
  id: string;
  item_name: string;
  transaction_type: "IN" | "OUT";
  quantity: number;
  reason: string;
  reference_number: string | null;
  date: string;
}

export interface PendingChallan {
  id: string;
  challan_number: string;
  movement_type: string;
  from_department_name: string;
  created_by: string;
  created_at: string;
  items: { item_name: string; item_code: string | null; quantity: number }[];
}



export default class TransactionService {
  static async getBinDetails(qrCodeString: string): Promise<BinDetails> {
    const response = await api.get<{ status: string; data: BinDetails }>(
      `/transactions/bin/${qrCodeString}`
    );
    return response.data.data;
  }

  // Add inside TransactionService class:
  static async manualAdjustment(payload: ManualTransactionPayload) {
    const response = await api.post("/transactions/manual", payload);
    return response.data;
  }

  static async generateQRCode(payload: { item_id: string; department_id: string; quantity: number }) {
    const response = await api.post("/transactions/generate-qr", payload);
    return response.data;
  }

  static async dispatchGoods(payload: { client_id: string; qr_codes: string[] }) {
    const response = await api.post("/transactions/dispatch", payload);
    return response.data;
  }

  static async getChallanHistory(): Promise<ChallanHistoryEntry[]> {
    const response = await api.get<{ status: string; history: ChallanHistoryEntry[] }>("/transactions/challan/history");
    return response.data.history;
  }

  static async transferScannedBins(payload: ScannerTransferPayload) {
    const response = await api.post("/transactions/challan/scan", payload);
    return response.data;
  }

  static async getDepartments() {
    const response = await api.get("/departments");
    return response.data.data;
  }

  static async getDepartmentHistory(departmentId: string): Promise<DepartmentTransaction[]> {
    const response = await api.get<{ status: string; data: DepartmentTransaction[] }>(`/transactions/history/${departmentId}`);
    return response.data.data;
  }

  static async getPendingChallans(departmentId: string): Promise<PendingChallan[]> {
    const response = await api.get<{ status: string; data: PendingChallan[] }>(`/transactions/challan/pending?department_id=${departmentId}`);
    return response.data.data;
  }

  // Uses native fetch (not axios) for the same reason as every other
  // upload in this app: axios forces a JSON Content-Type that breaks the
  // multipart boundary, and on web the asset needs its real File object,
  // not the {uri, name, type} shape RN's FormData polyfill expects.
  private static async uploadPhoto(
    path: string,
    fileAsset: { uri: string; name?: string; mimeType?: string; file?: File }
  ) {
    const formData = new FormData();
    if (Platform.OS === "web" && fileAsset.file) {
      formData.append("file", fileAsset.file, fileAsset.name || "photo.jpg");
    } else {
      formData.append("file", {
        uri: fileAsset.uri,
        name: fileAsset.name || "photo.jpg",
        type: fileAsset.mimeType || "image/jpeg",
      } as any);
    }

    const useAuthStore = (await import("@/store/authStore")).default;
    const { getSession } = await import("@/utils/storage");
    let token = useAuthStore.getState().jwt;
    if (!token) token = (await getSession())?.token || null;

    const response = await fetch(`${api.defaults.baseURL}${path}`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to upload photo");
    return data;
  }

  // Receiving department confirms a chalan by attaching a photo.
  static async verifyChallan(challanId: string, fileAsset: { uri: string; name?: string; mimeType?: string; file?: File }) {
    return TransactionService.uploadPhoto(`/transactions/challan/${challanId}/verify`, fileAsset);
  }

  // Attaches a photo (e.g. the physical chalan) to an already-logged
  // manual stock movement — /manual itself is plain JSON with no file
  // support, so this is always a second step after manualAdjustment().
  static async attachManualAdjustmentPhoto(transactionId: string, fileAsset: { uri: string; name?: string; mimeType?: string; file?: File }) {
    return TransactionService.uploadPhoto(`/transactions/manual/${transactionId}/photo`, fileAsset);
  }
}