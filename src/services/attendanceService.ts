import api from "./api";

export interface EmployeePayload {
  name: string;
  phone?: string;
  department_id?: string;
  base_monthly_salary?: number;
}

export interface MarkAttendancePayload {
  employee_id: string;
  date: string; // YYYY-MM-DD
  status: string;
  ot_hours?: number;
}

export default class AttendanceService {
  static async getDepartments() {
    const response = await api.get("/departments");
    return response.data.departments || response.data.data || [];
  }

  static async getDailyAttendance(dateString: string) {
    const response = await api.get(`/attendance/daily?date=${dateString}`);
    return response.data;
  }

  static async addEmployee(payload: EmployeePayload) {
    const response = await api.post("/attendance/employees", payload);
    return response.data;
  }

  static async markAttendance(payload: MarkAttendancePayload) {
    const response = await api.post("/attendance/mark", payload);
    return response.data;
  }
}