import { Platform } from "react-native";
import api from "./api";

export interface SupplierOrderPayload {
  supplier_id: string;
  department_id: string;
  notes?: string;
  is_urgent: number; // 0 or 1 based on your DB
  items: {
    product_id: string;
    ordered_qty: number;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
}

export default class SupplierOrderService {
  // Fetch dropdown data
  static async getSuppliers(): Promise<Supplier[]> {
    const response = await api.get("/suppliers");
    return response.data.suppliers;
  }

  static async createSupplier(payload: { name: string; contact_email?: string; phone?: string; address?: string }) {
    const response = await api.post("/suppliers/", payload);
    return response.data;
  }

  static async updateSupplier(id: string, payload: Partial<{ name: string; contact_email: string; phone: string; address: string }>) {
    const response = await api.put(`/suppliers/${id}`, payload);
    return response.data;
  }

  static async deleteSupplier(id: string) {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  }

  // Assuming you have these standard GET endpoints for the other dropdowns
  static async getItems() {
    const response = await api.get("/items"); // Update with your actual items endpoint
    return response.data.items || response.data.data; 
  }

  static async getDepartments() {
    const response = await api.get("/departments"); // Update with your actual departments endpoint
    return response.data.departments || response.data.data;
  }

  // Fetch past orders
  static async getOrders() {
    const response = await api.get("/suppliers/orders");
    return response.data.data;
  }

  // Place a new order (Handles both Single and Club based on the items array length)
  static async placeOrder(payload: SupplierOrderPayload) {
    const response = await api.post("/suppliers/orders", payload);
    return response.data;
  }

  // Production Manager approves/rejects an order once it comes through.
  static async updateOrderStatus(orderId: string, status: "Approved" | "Rejected") {
    const response = await api.put(`/suppliers/orders/${orderId}/status`, { status });
    return response.data;
  }

  // Attach a photo of the supplier's bill/chalan to an existing order.
  // fileAsset is whatever expo-image-picker / expo-document-picker returns
  // ({ uri, name, mimeType }, plus `.file` on web).
  static async uploadBillImage(orderId: string, fileAsset: { uri: string; name?: string; mimeType?: string; file?: File }) {
    const formData = new FormData();
    if (Platform.OS === "web" && fileAsset.file) {
      // On web the asset carries a real File object — the browser's
      // FormData needs that directly. The {uri, name, type} shape below is
      // a React Native-only convention; on web it just gets stringified
      // into a text field, so the backend sees no file part.
      formData.append("file", fileAsset.file, fileAsset.name || "chalan.jpg");
    } else {
      formData.append("file", {
        uri: fileAsset.uri,
        name: fileAsset.name || "chalan.jpg",
        type: fileAsset.mimeType || "image/jpeg",
      } as any);
    }

    // Native fetch (not axios) so the multipart boundary isn't clobbered by
    // axios's default JSON Content-Type header — same fix as the Excel
    // importer. Token comes from the auth store, NOT api.defaults, which is
    // never actually populated.
    const useAuthStore = (await import("@/store/authStore")).default;
    const { getSession } = await import("@/utils/storage");
    let token = useAuthStore.getState().jwt;
    if (!token) token = (await getSession())?.token || null;

    const response = await fetch(`${api.defaults.baseURL}/suppliers/orders/${orderId}/bill`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to upload bill image");
    return data;
  }
}