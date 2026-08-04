// src/services/oemService.ts
import api from "./api";

export interface OEMMapping {
  id: string;
  client_id: string;
  party_name: string;
  party_code: string;
  client_product_name: string | null;
  internal_product: string;
  internal_code: string | null;
  box_type: string | null;
  pieces_per_box: number | null;
  pouch_type: string | null;
  pieces_per_pouch: number | null;
  carton_type: string | null;
  pieces_per_carton: number | null;
  label_type: string | null;
}

export interface CreateOEMMappingPayload {
  party_name: string;
  party_code: string;
  internal_product: string;
  client_product_name?: string;
  box_type?: string;
  pieces_per_box?: number;
  pouch_type?: string;
  pieces_per_pouch?: number;
  carton_type?: string;
  pieces_per_carton?: number;
  label_type?: string;
}

export default class OEMService {
  static async getMappings(): Promise<OEMMapping[]> {
    const response = await api.get<{ status: string; mappings: OEMMapping[] }>("/oem");
    return response.data.mappings;
  }

  static async createMapping(payload: CreateOEMMappingPayload) {
    const response = await api.post("/oem", payload);
    return response.data;
  }
}