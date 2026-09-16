import api from "./api";

export interface QrZipRequestItem {
  item_id: string;
  quantity: number;
}

export interface QrZipResponse {
  status: string;
  filename: string;
  label_count: number;
  base64: string;
}

export interface QrImage {
  item_id: string;
  item_code: string;
  item_name: string;
  png_base64: string;
}

export interface QrImagesResponse {
  status: string;
  items: QrImage[];
}

export default class LabelService {
  static async generateQrZip(items: QrZipRequestItem[]) {
    const response = await api.post<QrZipResponse>("/labels/qr-zip", { items });
    return response.data;
  }

  // One rendered PNG per unique item_id (quantity isn't needed here — the
  // caller repeats the image as many times as it likes in its own layout).
  static async getQrImages(itemIds: string[]) {
    const response = await api.post<QrImagesResponse>("/labels/qr-images", {
      items: itemIds.map((item_id) => ({ item_id })),
    });
    return response.data.items;
  }
}
