import api from "./api";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  worker_name: string;
  date: string;
  status: "Present" | "Absent" | "Half-Day";
  check_in_time?: string;
}

export interface PayrollSummary {
  user_id: string;
  worker_name: string;
  total_days_worked: number;
  base_salary: number;
  bonus: number;
  total_payable: number;
}

export default class PayrollService {
  static async getAttendance(date: string): Promise<AttendanceRecord[]> {
    const response = await api.get<{ status: string; data: AttendanceRecord[] }>(
      `/payroll/attendance?date=${date}`
    );
    return response.data.data;
  }

  static async markAttendance(payload: { user_id: string; date: string; status: string }) {
    const response = await api.post("/payroll/attendance", payload);
    return response.data;
  }

  static async getPayrollReport(month: string): Promise<PayrollSummary[]> {
    const response = await api.get<{ status: string; data: PayrollSummary[] }>(
      `/payroll/report?month=${month}`
    );
    return response.data.data;
  }
}