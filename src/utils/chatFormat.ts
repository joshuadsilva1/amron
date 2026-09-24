import type { ChatUser } from "@/services/chatService";

// "PRODUCTION_MANAGER" -> "Production Manager"
export function formatRole(role?: string | null): string {
  if (!role) return "";
  return role.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// "Production Manager · Moulding" — whichever parts exist.
export function roleAndDepartment(user?: Pick<ChatUser, "role_name" | "department_name"> | null): string {
  if (!user) return "";
  return [formatRole(user.role_name), user.department_name].filter(Boolean).join(" · ");
}
