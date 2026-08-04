import api from "./api";

export interface MasterItem {
  id: string;
  item_code: string;
  name: string;
  type: string;
  category: string;
  subcategory?: string;
  unit_of_measure: string;
  pcs_per_scan: number;
  weight_grams?: number;
  master_qr_string: string;
}

export default class ItemService {
  static async getItems() {
    const response = await api.get<{ status: string; data: MasterItem[] }>("/items/");
    return response.data.data;
  }

  static async updateItem(id: string, payload: Partial<MasterItem>) {
    const response = await api.put(`/items/${id}`, payload);
    return response.data;
  }

  static async createItem(payload: Partial<MasterItem>) {
    const response = await api.post("/items/", payload);
    return response.data;
  }
}