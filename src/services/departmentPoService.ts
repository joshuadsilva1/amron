import api from "./api";

export interface DepartmentPOItem {
  id: string;
  component_id: string;
  component_code: string | null;
  component_name: string | null;
  unit_of_measure: string | null;
  quantity_requested: number;
  quantity_fulfilled: number;
}

export interface DepartmentPO {
  id: string;
  department_id: string;
  department_name: string | null;
  source_po_id: string | null;
  status: "Pending" | "In_Progress" | "Fulfilled";
  is_urgent: boolean;
  notes: string | null;
  created_at: string | null;
  fulfilled_at: string | null;
  items: DepartmentPOItem[];
}

export default class DepartmentPoService {
  // Walks a customer PO's recipes, raises (or tops up) one internal
  // DepartmentPO per department owing a part — direct components, plus
  // any made-here sub-parts below them (not bought raw materials) — and
  // notifies each department.
  static async generateFromPO(poId: string) {
    const response = await api.post<{ status: string; message: string; department_po_ids: string[] }>(
      "/department-pos/generate",
      { po_id: poId }
    );
    return response.data;
  }

  // Same, for several customer POs at once. One that can't be raised (no
  // recipe, ...) doesn't block the rest — the message lists what was
  // skipped and why.
  static async generateFromPOs(poIds: string[]) {
    const response = await api.post<{ status: string; message: string; department_po_ids: string[] }>(
      "/department-pos/generate",
      { po_ids: poIds }
    );
    return response.data;
  }

  static async getDepartmentPOs(departmentId?: string, status?: string) {
    const params: Record<string, string> = {};
    if (departmentId) params.department_id = departmentId;
    if (status) params.status = status;
    const response = await api.get<{ status: string; data: DepartmentPO[] }>("/department-pos", { params });
    return response.data.data;
  }

  static async getDepartmentPO(id: string) {
    const response = await api.get<{ status: string; data: DepartmentPO }>(`/department-pos/${id}`);
    return response.data.data;
  }
}
