import api from "./api";

// 1. Updated Interface to match your backend and UI completely
export interface Client {
  id?: string; // Made optional so you can create a client without an ID
  name: string;
  contact_email?: string;
  phone?: string;
  shipping_address?: string;
}

export default class ClientService {
  static async getClients(): Promise<Client[]> {
    // 2. Removed the trailing slash to prevent Flask 308 Redirects
    const response = await api.get<{ status: string; clients: Client[] }>("/clients");
    return response.data.clients;
  }

  static async createClient(payload: Client) {
    // 2. Removed the trailing slash here too
    const response = await api.post("/clients", payload);
    return response.data;
  }
}