import api from "./api";

export interface MRPItem {
  item_id: string;
  item_code: string | null;
  item_name: string;
  category: string | null;
  physical_stock: number;
  reserved: number;
  available: number;
  safety_stock: number;
  incoming: number;
  shortage: number;
  suppliers: { id: string; name: string }[];
}

export interface MRPSupplierGroup {
  supplier_id: string | null;
  supplier_name: string;
  items: MRPItem[];
}

export interface MRPSummary {
  items: MRPItem[];
  shortage_count: number;
  grouped_by_supplier: MRPSupplierGroup[];
}

export default class MRPService {
  static async getSummary(): Promise<MRPSummary> {
    const response = await api.get<{ status: string } & MRPSummary>("/mrp/summary");
    return response.data;
  }

  static async assignSupplier(itemId: string, supplierId: string) {
    const response = await api.post("/mrp/assign-supplier", { item_id: itemId, supplier_id: supplierId });
    return response.data;
  }

  static async unassignSupplier(linkId: string) {
    const response = await api.delete(`/mrp/assign-supplier/${linkId}`);
    return response.data;
  }
}
