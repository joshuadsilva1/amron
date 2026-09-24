import { Platform } from "react-native";
import api from "./api";

export interface DepartmentConfig {
  id: string;
  department_code: number;
  name: string;
  level: number;
}

export interface DepartmentRoute {
  id: string;
  fromId: string;
  toId: string;
}

export default class AdminService {
  static async getRoutes(): Promise<DepartmentRoute[]> {
    const response = await api.get<{ data: DepartmentRoute[] }>("/admin/routing");
    return response.data.data;
  }

  // Native fetch, not axios — same reason as every other file upload in
  // this app (transactionService.uploadPhoto): axios forces a JSON
  // Content-Type that breaks the multipart boundary.
  static async uploadModuleIcon(fileAsset: { uri: string; name?: string; mimeType?: string; file?: File }): Promise<string> {
    const formData = new FormData();
    if (Platform.OS === "web" && fileAsset.file) {
      formData.append("file", fileAsset.file, fileAsset.name || "icon.png");
    } else {
      formData.append("file", {
        uri: fileAsset.uri,
        name: fileAsset.name || "icon.png",
        type: fileAsset.mimeType || "image/png",
      } as any);
    }

    const useAuthStore = (await import("@/store/authStore")).default;
    const { getSession } = await import("@/utils/storage");
    let token = useAuthStore.getState().jwt;
    if (!token) token = (await getSession())?.token || null;

    const response = await fetch(`${api.defaults.baseURL}/admin/modules/icon-upload`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to upload icon");
    return data.url;
  }
}