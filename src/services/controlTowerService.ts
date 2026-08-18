import api from "./api";

export interface ControlTowerSummary {
  total_active_pos: number;
  new_today: number;
  urgent: number;
  due_today: number;
  due_tomorrow: number;
  overdue: number;
  production_planned_today: number;
  production_completed_today: number;
  production_pending_today: number;
  material_shortages: number;
  quality_holds: number;
  supplier_pending: number;
  dispatch_pending: number;
}

export interface ControlTowerOrderRow {
  po_id: string;
  customer: string;
  product: string;
  quantity: number;
  produced_qty: number;
  dispatched_qty: number;
  due_date: string | null;
  is_urgent: boolean;
  current_stage: string;
  risk: "GREEN" | "YELLOW" | "RED";
}

export interface ControlTowerResponse {
  today: ControlTowerSummary;
  orders: ControlTowerOrderRow[];
  status_pipeline: string[];
  generated_at: string;
}

export default class ControlTowerService {
  static async getSummary(): Promise<ControlTowerResponse> {
    const response = await api.get<{ status: string } & ControlTowerResponse>("/control-tower/summary");
    return response.data;
  }
}
