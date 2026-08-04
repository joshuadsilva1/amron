import api from "./api";

export interface ProductionPlan {
  plan_id: string;
  production_date: string;
  department: string;
  product_name: string;
  internal_code: string;
  target_quantity: number;
  completed_quantity: number;
  priority: string;
  status: string;
}

export interface CreatePlanPayload {
  production_date: string; // YYYY-MM-DD
  product_id: string;
  department_name: string;
  target_quantity: number;
  priority: "Normal" | "Urgent";
}

export interface LogProductionPayload {
  department_id: string;
  item_id: string;
  quantity: number;
  user_name?: string;
}

export interface DepartmentStockRow {
  item_id: string;
  item_name: string;
  item_code: string;
  category: string;
  quantity_on_shelf: number;
  unit_of_measure: string;
}

export default class ProductionService {
  static async getPlans(date?: string, department?: string): Promise<ProductionPlan[]> {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (department) params.append("department", department);

    const response = await api.get<{ status: string; data: ProductionPlan[] }>(
      `/production/?${params.toString()}`
    );
    return response.data.data;
  }

  static async createPlan(payload: CreatePlanPayload) {
    const response = await api.post("/production/", payload);
    return response.data;
  }

  // Production Manager pushes the day's allotment out as a notification to
  // everyone in that department.
  static async sendSchedule(departmentName: string, productionDate: string) {
    const response = await api.post("/production/send-schedule", {
      department_name: departmentName,
      production_date: productionDate,
    });
    return response.data;
  }

  // Logs an actual manufacturing event: consumes recipe (BOM) components
  // from the department's stock and credits the finished good.
  static async logProduction(payload: LogProductionPayload) {
    const response = await api.post("/transactions/produce", payload);
    return response.data;
  }

  static async getDepartmentStock(departmentId: string): Promise<DepartmentStockRow[]> {
    const response = await api.get<{ status: string; stock: DepartmentStockRow[] }>(`/departments/${departmentId}/stock`);
    return response.data.stock;
  }
}