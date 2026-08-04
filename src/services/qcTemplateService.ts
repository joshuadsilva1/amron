import { Platform } from "react-native";
import api from "./api";

export interface QCCheckpoint {
  id: string;
  serial_no: number | null;
  check_point: string;
  standard_criteria: string | null;
  entry_labels: string[];
  sort_order: number;
}

export interface QCSection {
  id: string;
  title: string;
  sort_order: number;
  checkpoints: QCCheckpoint[];
}

export interface QCTemplateSummary {
  id: string;
  name: string;
  qc_type: "IQC" | "PQC" | "OQC" | "ASSEMBLY";
  category: string | null;
  header_fields: string[];
  is_active: boolean;
}

export interface QCTemplateDetail extends QCTemplateSummary {
  sections: QCSection[];
}

export interface QCObservationInput {
  checkpoint_id: string;
  entry_label: string;
  result: "Pass" | "Fail" | "NA";
  remark?: string;
  image_url?: string;
}

export interface SubmitInspectionPayload {
  template_id: string;
  reference_type: "BIN" | "SUPPLIER_DELIVERY" | "PRODUCTION_LINE";
  qr_code_string?: string;
  item_id?: string;
  department_id?: string;
  header_data: Record<string, string>;
  inspector_name: string;
  overall_result: "Pending" | "Approved" | "Approved_With_Observation" | "Rejected";
  overall_remarks?: string;
  supervisor_approval?: string;
  observations: QCObservationInput[];
}

export default class QCTemplateService {
  static async getTemplates(filters?: { qc_type?: string; category?: string }): Promise<QCTemplateSummary[]> {
    const params = new URLSearchParams();
    if (filters?.qc_type) params.set("qc_type", filters.qc_type);
    if (filters?.category) params.set("category", filters.category);
    const qs = params.toString();
    const response = await api.get<{ status: string; data: QCTemplateSummary[] }>(`/qc/templates${qs ? `?${qs}` : ""}`);
    return response.data.data;
  }

  static async getTemplate(templateId: string): Promise<QCTemplateDetail> {
    const response = await api.get<{ status: string; data: QCTemplateDetail }>(`/qc/templates/${templateId}`);
    return response.data.data;
  }

  static async submitInspection(payload: SubmitInspectionPayload) {
    const response = await api.post("/qc/inspections", payload);
    return response.data;
  }

  // Attaches the two mandatory drop-test photos to an already-submitted
  // inspection. Native fetch (not axios) so the multipart boundary isn't
  // clobbered by axios's default JSON Content-Type — same fix as every
  // other upload in this app. On web the asset needs its real File object,
  // not the {uri, name, type} shape RN's FormData polyfill expects.
  static async uploadDropTestPhotos(
    inspectionId: string,
    photo1: { uri: string; name?: string; mimeType?: string; file?: File },
    photo2: { uri: string; name?: string; mimeType?: string; file?: File }
  ) {
    const formData = new FormData();
    const appendPhoto = (key: string, photo: typeof photo1) => {
      if (Platform.OS === "web" && photo.file) {
        formData.append(key, photo.file, photo.name || `${key}.jpg`);
      } else {
        formData.append(key, {
          uri: photo.uri,
          name: photo.name || `${key}.jpg`,
          type: photo.mimeType || "image/jpeg",
        } as any);
      }
    };
    appendPhoto("photo_1", photo1);
    appendPhoto("photo_2", photo2);

    const useAuthStore = (await import("@/store/authStore")).default;
    const { getSession } = await import("@/utils/storage");
    let token = useAuthStore.getState().jwt;
    if (!token) token = (await getSession())?.token || null;

    const response = await fetch(`${api.defaults.baseURL}/qc/inspections/${inspectionId}/photos`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to upload drop-test photos");
    return data;
  }
}
