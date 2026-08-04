import api from "./api";

export interface BoxMapping {
  id: string;
  box_item_id: string;
  box_name: string;
  box_code: string | null;
  product_id: string;
  product_name: string;
  product_code: string | null;
  pcs_per_box: number;
}

export default class BoxService {
  static async getMappings(): Promise<BoxMapping[]> {
    const response = await api.get<{ status: string; data: BoxMapping[] }>("/boxes/mappings");
    return response.data.data;
  }

  // Upsert — saving the same (box, product) pair again just updates the qty.
  static async saveMapping(boxItemId: string, productId: string, pcsPerBox: number) {
    const response = await api.post("/boxes/mappings", {
      box_item_id: boxItemId,
      product_id: productId,
      pcs_per_box: pcsPerBox,
    });
    return response.data;
  }

  static async deleteMapping(mappingId: string) {
    const response = await api.delete(`/boxes/mappings/${mappingId}`);
    return response.data;
  }
}
