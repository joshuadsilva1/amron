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
  dispatched_qty: number;
}

export interface POItemPayload {
  mapping_id: string;
  quantity: number;
}

export interface CreatePOPayload {
  client_id: string;
  notes: string;
  is_urgent: number;
  due_date?: string;
  challan_number?: string;
  items: POItemPayload[];
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

  static async createPO(payload: CreatePOPayload) {
    // TWEAK: Removed the trailing slash here so it matches the Flask strict_slashes rules
    const response = await api.post("/orders", payload);
    return response.data;
  }
}