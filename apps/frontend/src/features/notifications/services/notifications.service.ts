import { apiClient } from "@/services/api-client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  reference: string | null;
  href: string | null;
  meta: unknown;
  readAt: string | null;
  createdAt: string;
  unread: boolean;
}

export async function listNotifications(): Promise<{
  unreadCount: number;
  items: AppNotification[];
}> {
  const res = await apiClient.request<{ unreadCount: number; items: AppNotification[] }>(
    "/notifications",
  );
  return res.data ?? { unreadCount: 0, items: [] };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiClient.request<{ unreadCount: number }>("/notifications/unread-count");
  return res.data?.unreadCount ?? 0;
}

export async function markNotificationRead(id: string): Promise<number> {
  const res = await apiClient.request<{ unreadCount: number }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
  return res.data?.unreadCount ?? 0;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiClient.request<{ unreadCount: number }>("/notifications/read-all", {
    method: "PATCH",
  });
  return res.data?.unreadCount ?? 0;
}
