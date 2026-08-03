import { apiClient } from "@/services/api-client";

export type CampaignStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED";

export interface AdminCampaign {
  id: string;
  subject: string;
  previewText: string | null;
  bodyHtml: string;
  bodyText: string | null;
  status: CampaignStatus;
  sentAt: string | null;
  recipientCount: number;
  successCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCampaignsList {
  subscriberCount: number;
  campaigns: AdminCampaign[];
}

export interface CampaignPayload {
  subject: string;
  previewText?: string;
  bodyHtml: string;
  bodyText?: string;
}

export async function listAdminCampaigns(): Promise<AdminCampaignsList> {
  const response = await apiClient.request<AdminCampaignsList>("/admin/campaigns");
  return response.data as AdminCampaignsList;
}

export async function getAdminCampaign(id: string): Promise<AdminCampaign> {
  const response = await apiClient.request<AdminCampaign>(`/admin/campaigns/${id}`);
  return response.data as AdminCampaign;
}

export async function createAdminCampaign(payload: CampaignPayload): Promise<AdminCampaign> {
  const response = await apiClient.request<AdminCampaign>("/admin/campaigns", {
    method: "POST",
    body: payload,
  });
  return response.data as AdminCampaign;
}

export async function updateAdminCampaign(
  id: string,
  payload: CampaignPayload,
): Promise<AdminCampaign> {
  const response = await apiClient.request<AdminCampaign>(`/admin/campaigns/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return response.data as AdminCampaign;
}

export async function deleteAdminCampaign(id: string): Promise<void> {
  await apiClient.request(`/admin/campaigns/${id}`, { method: "DELETE" });
}

export async function sendAdminCampaign(id: string): Promise<AdminCampaign> {
  const response = await apiClient.request<AdminCampaign>(`/admin/campaigns/${id}/send`, {
    method: "POST",
  });
  return response.data as AdminCampaign;
}

export type SubscriberFilter = "subscribed" | "unsubscribed" | "all";

export interface AdminMarketingSubscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  marketingOptIn: boolean;
  marketingOptInAt: string | null;
  createdAt: string;
}

export interface AdminSubscribersList {
  filter: SubscriberFilter;
  subscriberCount: number;
  unsubscribedCount: number;
  total: number;
  subscribers: AdminMarketingSubscriber[];
}

export async function listAdminCampaignSubscribers(input?: {
  filter?: SubscriberFilter;
  q?: string;
}): Promise<AdminSubscribersList> {
  const params = new URLSearchParams();
  if (input?.filter) params.set("filter", input.filter);
  if (input?.q?.trim()) params.set("q", input.q.trim());
  const qs = params.toString();
  const response = await apiClient.request<AdminSubscribersList>(
    `/admin/campaigns/subscribers${qs ? `?${qs}` : ""}`,
  );
  return response.data as AdminSubscribersList;
}

export async function setAdminMarketingOptIn(
  userId: string,
  marketingOptIn: boolean,
): Promise<AdminMarketingSubscriber> {
  const response = await apiClient.request<AdminMarketingSubscriber>(
    `/admin/campaigns/subscribers/${userId}`,
    {
      method: "PATCH",
      body: { marketingOptIn },
    },
  );
  return response.data as AdminMarketingSubscriber;
}

export async function unsubscribeMarketing(token: string): Promise<{
  ok: boolean;
  email?: string;
  message?: string;
}> {
  const response = await apiClient.request<{ ok: boolean; email?: string; message?: string }>(
    "/marketing/unsubscribe",
    {
      method: "POST",
      body: { token },
    },
  );
  return response.data as { ok: boolean; email?: string; message?: string };
}
