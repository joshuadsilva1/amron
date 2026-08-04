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
}