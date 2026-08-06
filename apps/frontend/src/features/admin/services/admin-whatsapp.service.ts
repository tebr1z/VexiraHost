import { apiClient } from "@/services/api-client";

export type WhatsappConnectionStatus = "DISCONNECTED" | "QR_READY" | "CONNECTING" | "CONNECTED";

export interface WhatsappStatus {
  status: WhatsappConnectionStatus;
  phoneNumber: string | null;
  displayName: string | null;
  lastConnectedAt: string | null;
  lastQrAt: string | null;
  lastError: string | null;
  hasQr: boolean;
}

export interface WhatsappQr {
  status: WhatsappConnectionStatus;
  qr: string | null;
  qrDataUrl: string | null;
}

export interface WhatsappGatewayAccount {
  id: string;
  label: string;
  status: WhatsappConnectionStatus;
  phoneNumber: string | null;
  displayName: string | null;
  isEnabled: boolean;
  sentCount: number;
  failedCount: number;
  lastSentAt: string | null;
  lastQrAt: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
}

export interface WhatsappUserOption {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface WhatsappMessageLog {
  id: string;
  toPhone: string;
  userId: string | null;
  body: string;
  status: "PENDING" | "SENT" | "FAILED";
  error: string | null;
  createdAt: string;
}

export interface WhatsappApiAccess {
  isEnabled: boolean;
  monthlyLimit: number;
  used: number;
  failed: number;
  remaining: number;
  periodStart: string;
}

export async function getWhatsappStatus(): Promise<WhatsappStatus> {
  const res = await apiClient.request<WhatsappStatus>("/admin/whatsapp/status");
  return res.data as WhatsappStatus;
}

export async function getWhatsappQr(): Promise<WhatsappQr> {
  const res = await apiClient.request<WhatsappQr>("/admin/whatsapp/qr");
  return res.data as WhatsappQr;
}

export async function connectWhatsapp(): Promise<WhatsappStatus> {
  const res = await apiClient.request<WhatsappStatus>("/admin/whatsapp/connect", {
    method: "POST",
  });
  return res.data as WhatsappStatus;
}

export async function disconnectWhatsapp(): Promise<WhatsappStatus> {
  const res = await apiClient.request<WhatsappStatus>("/admin/whatsapp/disconnect", {
    method: "POST",
  });
  return res.data as WhatsappStatus;
}

export async function listWhatsappGatewayAccounts(): Promise<WhatsappGatewayAccount[]> {
  const res = await apiClient.request<WhatsappGatewayAccount[]>("/admin/whatsapp/accounts");
  return res.data ?? [];
}

export async function createWhatsappGatewayAccount(label: string): Promise<WhatsappGatewayAccount> {
  const res = await apiClient.request<WhatsappGatewayAccount>("/admin/whatsapp/accounts", {
    method: "POST",
    body: { label },
  });
  return res.data as WhatsappGatewayAccount;
}

export async function updateWhatsappGatewayAccount(
  id: string,
  input: { label?: string; isEnabled?: boolean },
): Promise<WhatsappGatewayAccount> {
  const res = await apiClient.request<WhatsappGatewayAccount>(`/admin/whatsapp/accounts/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as WhatsappGatewayAccount;
}

export async function getWhatsappGatewayAccountQr(id: string): Promise<WhatsappQr> {
  const res = await apiClient.request<WhatsappQr>(`/admin/whatsapp/accounts/${id}/qr`);
  return res.data as WhatsappQr;
}

export async function connectWhatsappGatewayAccount(id: string): Promise<WhatsappGatewayAccount> {
  const res = await apiClient.request<WhatsappGatewayAccount>(
    `/admin/whatsapp/accounts/${id}/connect`,
    {
      method: "POST",
    },
  );
  return res.data as WhatsappGatewayAccount;
}

export async function disconnectWhatsappGatewayAccount(
  id: string,
): Promise<WhatsappGatewayAccount> {
  const res = await apiClient.request<WhatsappGatewayAccount>(
    `/admin/whatsapp/accounts/${id}/disconnect`,
    {
      method: "POST",
    },
  );
  return res.data as WhatsappGatewayAccount;
}

export async function listWhatsappUsers(q?: string): Promise<WhatsappUserOption[]> {
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const res = await apiClient.request<WhatsappUserOption[]>(`/admin/whatsapp/users${query}`);
  return res.data ?? [];
}

export async function listWhatsappMessages(): Promise<WhatsappMessageLog[]> {
  const res = await apiClient.request<WhatsappMessageLog[]>("/admin/whatsapp/messages");
  return res.data ?? [];
}

export async function sendWhatsappMessage(input: {
  userId?: string;
  phone?: string;
  message: string;
}): Promise<WhatsappMessageLog> {
  const res = await apiClient.request<WhatsappMessageLog>("/admin/whatsapp/send", {
    method: "POST",
    body: input,
  });
  return res.data as WhatsappMessageLog;
}

export async function getAdminWhatsappApiAccess(userId: string): Promise<WhatsappApiAccess> {
  const res = await apiClient.request<WhatsappApiAccess>(`/admin/whatsapp/api/users/${userId}`);
  return res.data as WhatsappApiAccess;
}

export async function updateAdminWhatsappApiAccess(
  userId: string,
  input: { isEnabled: boolean; monthlyLimit: number },
): Promise<WhatsappApiAccess> {
  const res = await apiClient.request<WhatsappApiAccess>(`/admin/whatsapp/api/users/${userId}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as WhatsappApiAccess;
}
