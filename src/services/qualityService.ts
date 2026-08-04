import api from "./api";

export interface InspectionPayload {
  qr_code_string: string;
  inspector_name: string;
  status_given: "Passed" | "Rejected";
  checklist_data?: any; // The N1-N5 data from your Excel format
}

export default class QualityService {
  static async submitInspection(payload: InspectionPayload) {
    const response = await api.post("/qc/inspect", payload);
    return response.data;
  }
}