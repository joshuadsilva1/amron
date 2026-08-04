import api from "./api";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default class NotificationService {
  static async getNotifications(): Promise<NotificationItem[]> {
    const response = await api.get<{ status: string; data: NotificationItem[] }>("/notifications");
    return response.data.data;
  }

  static async markAllAsRead() {
    const response = await api.post("/notifications/mark-read");
    return response.data;
  }
}