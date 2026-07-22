import { apiClient } from "@/services/api-client";

export interface AdminTldPricing {
  id: string;
  tld: string;
  registerPrice: number;
  renewPrice: number;
  transferPrice: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function listAdminTlds(): Promise<AdminTldPricing[]> {
  const res = await apiClient.request<AdminTldPricing[]>("/admin/domains/tlds");
  return res.data ?? [];
}

export async function getAdminTld(id: string): Promise<AdminTldPricing> {
  const res = await apiClient.request<AdminTldPricing>(`/admin/domains/tlds/${id}`);
  return res.data as AdminTldPricing;
}

export async function createAdminTld(
  input: Omit<AdminTldPricing, "id" | "createdAt" | "updatedAt">,
): Promise<AdminTldPricing> {
  const res = await apiClient.request<AdminTldPricing>("/admin/domains/tlds", {
    method: "POST",
    body: input,
  });
  return res.data as AdminTldPricing;
}

export async function updateAdminTld(
  id: string,
  input: Partial<Omit<AdminTldPricing, "id" | "tld" | "createdAt" | "updatedAt">>,
): Promise<AdminTldPricing> {
  const res = await apiClient.request<AdminTldPricing>(`/admin/domains/tlds/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminTldPricing;
}

export async function deleteAdminTld(id: string): Promise<void> {
  await apiClient.request(`/admin/domains/tlds/${id}`, { method: "DELETE" });
}
