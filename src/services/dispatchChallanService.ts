import api from "./api";

export interface DispatchChallanItem {
  item_id: string;
  qty: number;
}

export interface DispatchChallanPayload {
  challan_number: string;
  client_id?: string;
  purchase_order_id?: string;
  note?: string;
  items: DispatchChallanItem[];
}

export default class DispatchChallanService {
  // Fetch dropdown data for the modal
  static async getClients() {
    const response = await api.get("/clients");
    return response.data.clients || response.data.data || [];
  }

  // /orders returns one row per PO line item (client-wise), not one row
  // per PO — dedupe down to one dropdown entry per purchase order.
  static async getPurchaseOrders() {
    const response = await api.get("/orders");
    const rows = response.data.orders || [];
    const byPoId = new Map<string, { id: string; name: string }>();
    for (const row of rows) {
      if (!byPoId.has(row.po_id)) {
        byPoId.set(row.po_id, {
          id: row.po_id,
          name: row.chalan_no ? `${row.chalan_no} — ${row.client_name}` : `${row.client_name} (${row.po_id.slice(0, 8)})`,
        });
      }
    }
    return Array.from(byPoId.values());
  }

  static async getItems() {
    const response = await api.get("/items");
    return response.data.items || response.data.data || [];
  }

  // Fetch the lists for Pending and Dispatched tabs
  static async getChallans() {
    const response = await api.get("/transactions/dispatch/challans");
    return response.data.data || [];
  }

  // Submit the manual dispatch challan from the modal
  static async createChallan(payload: DispatchChallanPayload) {
    const response = await api.post("/transactions/dispatch/challans", payload);
    return response.data;
  }
}