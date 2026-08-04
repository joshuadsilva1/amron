import api from "./api";

export interface ChatUser {
  id: string;
  name: string;
  role_name: string | null;
  department_id: string | null;
}

export interface ChatChannelSummary {
  channel_id: string;
  type: "DM" | "GROUP";
  name: string;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export default class ChatService {
  static async getDirectory(): Promise<ChatUser[]> {
    const response = await api.get<{ status: string; users: ChatUser[] }>("/chat/users");
    return response.data.users;
  }

  static async getChannels(): Promise<ChatChannelSummary[]> {
    const response = await api.get<{ status: string; channels: ChatChannelSummary[] }>("/chat/channels");
    return response.data.channels;
  }

  static async openDM(userId: string): Promise<string> {
    const response = await api.post<{ status: string; channel_id: string }>("/chat/dm", { user_id: userId });
    return response.data.channel_id;
  }

  static async createGroup(name: string, memberIds: string[]): Promise<string> {
    const response = await api.post<{ status: string; channel_id: string }>("/chat/channels", {
      name,
      member_ids: memberIds,
    });
    return response.data.channel_id;
  }

  static async getMessages(channelId: string, afterId?: string): Promise<ChatMessage[]> {
    const url = afterId
      ? `/chat/channels/${channelId}/messages?after=${afterId}`
      : `/chat/channels/${channelId}/messages`;
    const response = await api.get<{ status: string; messages: ChatMessage[] }>(url);
    return response.data.messages;
  }

  static async sendMessage(channelId: string, body: string): Promise<ChatMessage> {
    const response = await api.post<{ status: string; message: ChatMessage }>(
      `/chat/channels/${channelId}/messages`,
      { body }
    );
    return response.data.message;
  }

  static async markRead(channelId: string) {
    const response = await api.post(`/chat/channels/${channelId}/read`);
    return response.data;
  }
}
