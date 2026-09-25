import api from "./api";

export interface ClubbedOrder {
  internal_code: string;
  category: string;
  product_name: string;
  total_quantity_to_manufacture: number;
}

export interface OrderLineItem {
  po_id: string;
  line_item_id: string;
  client_id: string;
  client_name: string;
  chalan_no: string | null;
  order_date: string | null;
  due_date: string | null;
  is_urgent: boolean;
  status: string;
  notes: string | null;
  oem_code: string;
  oem_name: string | null;
  internal_code: string | null;
  internal_product_name: string;
  category: string;
  quantity: number;
  produced_qty: number;
  dispatched_qty: number;
}

// A line is either an existing client-code mapping, or one of our
// finished goods picked directly — the backend remembers the client's
// code for it the first time (no separate OEM-mapping step).
export interface POItemPayload {
  mapping_id?: string;
  product_id?: string;
  client_product_code?: string;
  quantity: number;
}

export interface CreatePOPayload {
  client_id: string;
  notes: string;
  is_urgent: number;
  due_date?: string;
  challan_number?: string;
  items: POItemPayload[];
  // Raise the internal department POs in the same step.
  send_to_departments?: boolean;
}

export interface CreatePOResult {
  status: string;
  po_id: string;
  // null when send_to_departments wasn't asked for.
  send_result: { ok: boolean; changed: boolean; message: string } | null;
}

export default class OrderService {
  static async getOrders(status?: string): Promise<OrderLineItem[]> {
    const url = status ? `/orders?status=${encodeURIComponent(status)}` : "/orders";
    const response = await api.get<{ status: string; orders: OrderLineItem[] }>(url);
    return response.data.orders;
  }

  static async getClubbedOrders(): Promise<ClubbedOrder[]> {
    const response = await api.get<{ status: string; clubbed_orders: ClubbedOrder[] }>("/orders/clubbed");
    return response.data.clubbed_orders;
  }

  static async createPO(payload: CreatePOPayload): Promise<CreatePOResult> {
    // TWEAK: Removed the trailing slash here so it matches the Flask strict_slashes rules
    const response = await api.post<CreatePOResult>("/orders", payload);
    return response.data;
  }

  static async getStatusPipeline(): Promise<string[]> {
    const response = await api.get<{ status: string; statuses: string[] }>("/orders/statuses");
    return response.data.statuses;
  }

  static async updateStatus(poId: string, newStatus: string) {
    const response = await api.put(`/orders/${poId}/status`, { status: newStatus });
    return response.data;
  }

  static async updateLineItemProgress(
    lineItemId: string,
    updates: { produced_qty?: number; dispatched_qty?: number }
  ) {
    const response = await api.put(`/orders/line-items/${lineItemId}`, updates);
    return response.data;
  }
}