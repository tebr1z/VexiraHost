import { apiClient } from "@/services/api-client";

export interface WhatsappApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface WhatsappApiDashboard {
  access: {
    isEnabled: boolean;
    monthlyLimit: number;
    used: number;
    remaining: number;
    failed: number;
    periodStart: string;
  };
  gatewayConnected: boolean;
  endpoint: string;
  keys: WhatsappApiKeySummary[];
  maxActiveKeys: number;
}

export interface CreatedWhatsappApiKey {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  lastFour: string;
  createdAt: string;
  warning: string;
}

export async function getWhatsappApiDashboard(): Promise<WhatsappApiDashboard> {
  const response = await apiClient.request<WhatsappApiDashboard>("/whatsapp-api");
  return response.data as WhatsappApiDashboard;
}

export async function createWhatsappApiKey(name: string): Promise<CreatedWhatsappApiKey> {
  const response = await apiClient.request<CreatedWhatsappApiKey>("/whatsapp-api/keys", {
    method: "POST",
    body: { name },
  });
  return response.data as CreatedWhatsappApiKey;
}

export async function revokeWhatsappApiKey(id: string): Promise<void> {
  await apiClient.request(`/whatsapp-api/keys/${id}`, { method: "DELETE" });
}

export async function updateWhatsappApiKeyStatus(id: string, isActive: boolean): Promise<void> {
  await apiClient.request(`/whatsapp-api/keys/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export async function testWhatsappApiMessage(input: {
  endpoint: string;
  apiKey: string;
  phone: string;
  message: string;
}): Promise<{
  id: string;
  status: string;
  to: string;
  usage: { limit: number; used: number; remaining: number };
}> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": input.apiKey,
    },
    body: JSON.stringify({ phone: input.phone, message: input.message }),
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: unknown;
    message?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.message ?? `HTTP ${response.status}`);
  }
  return (payload?.data ?? payload) as {
    id: string;
    status: string;
    to: string;
    usage: { limit: number; used: number; remaining: number };
  };
}
