import api from "./api";

export interface WhatsAppConfig {
  provider: string;
  app_name: string | null;
  sender_number: string | null;
  is_active: boolean;
  api_key_last4: string | null;
}

export interface SaveWhatsAppConfigPayload {
  api_key: string;
  app_name?: string;
  sender_number: string;
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
}
