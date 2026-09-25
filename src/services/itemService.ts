import api from "./api";

export interface MasterItem {
  id: string;
  item_code: string;
  name: string;
  description?: string | null;
  oem_company_code?: string | null;
  department_id?: string | null;
  // Lives in a top-level department — the only kind a customer orders.
  is_finished_good?: boolean;
  price?: number;
  type: string;
  category: string;
  subcategory?: string;
  unit_of_measure: string;
  pcs_per_scan: number;
  weight_grams?: number;
  master_qr_string: string;
}

export interface UnitOfMeasure {
  id: number;
  name: string;
  description: string | null;
}

export default class ItemService {
  static async getUnits(): Promise<UnitOfMeasure[]> {
    const response = await api.get<{ status: string; data: UnitOfMeasure[] }>("/items/units");
    return response.data.data;
  }

  static async createUnit(name: string, description?: string) {
    const response = await api.post("/items/units", { name, description });
    return response.data;
  }

  static async deleteUnit(id: number) {
    const response = await api.delete(`/items/units/${id}`);
    return response.data;
  }

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