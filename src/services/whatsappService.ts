import api from "./api";

export interface WhatsAppConfig {
  provider: string;
  app_name: string | null;
  sender_number: string | null;
  is_active: boolean;
  api_key_last4: string | null;
}

export type WhatsAppProvider = "callmebot" | "gupshup";

export interface SaveWhatsAppConfigPayload {
  provider: WhatsAppProvider;
  api_key: string;
  app_name?: string;
  sender_number: string;
}

export interface ReportSubscription {
  recipient_number: string;
  send_time: string; // "HH:MM", factory-local time
  is_enabled: boolean;
  last_sent_on: string | null;
  last_status: "sent" | "failed" | null;
  last_error: string | null;
}

export interface ReportSection {
  department_id: string | null; // null = whole factory
  name: string;
  subscription: ReportSubscription | null;
}

export default class WhatsAppService {
  static async getConfig(): Promise<WhatsAppConfig | null> {
    const response = await api.get<{ status: string; data: WhatsAppConfig | null }>("/whatsapp/config");
    return response.data.data;
  }

  static async saveConfig(payload: SaveWhatsAppConfigPayload) {
    const response = await api.post("/whatsapp/config", payload);
    return response.data;
  }

  static async sendTestMessage(toNumber: string) {
    const response = await api.post("/whatsapp/test", { to_number: toNumber });
    return response.data;
  }

  static async getReportSections(): Promise<ReportSection[]> {
    const response = await api.get<{ status: string; data: ReportSection[] }>("/whatsapp/reports");
    return response.data.data;
  }

  static async saveReportSubscription(payload: {
    department_id: string | null;
    recipient_number: string;
    send_time: string;
    is_enabled: boolean;
  }) {
    const response = await api.put("/whatsapp/reports", payload);
    return response.data;
  }

  // Sends right now. `toNumber` omitted = that report's saved recipient.
  static async sendReportNow(departmentId: string | null, toNumber?: string) {
    const response = await api.post("/whatsapp/reports/send-now", {
      department_id: departmentId,
      to_number: toNumber,
    });
    return response.data;
  }

  static async previewReport(departmentId: string | null): Promise<string> {
    const response = await api.get<{ status: string; text: string }>("/whatsapp/reports/preview", {
      params: departmentId ? { department_id: departmentId } : {},
    });
    return response.data.text;
  }
}
