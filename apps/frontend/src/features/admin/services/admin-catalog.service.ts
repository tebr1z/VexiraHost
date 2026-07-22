import { apiClient } from "@/services/api-client";

export interface AdminHostingPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  panel: "CPANEL" | "PLESK";
  serverId: string | null;
  server: {
    id: string;
    name: string;
    ipAddress: string;
    panel: "CPANEL" | "PLESK";
    isActive: boolean;
  } | null;
  diskGb: number;
  bandwidthGb: number;
  maxDomains: number;
  maxEmails: number;
  maxDatabases: number;
  price: number;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  sortOrder: number;
  accountCount: number;
  pleskPlanName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminServerPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: "VPS" | "DEDICATED";
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  bandwidthGbps: number;
  regions: string[];
  price: number;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  sortOrder: number;
  serverCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductPrice {
  currency: "USD" | "EUR" | "AZN";
  period: "MONTHLY" | "YEARLY";
  originalPrice: number;
  salePrice: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  hostingPlanSlug: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  isActive: boolean;
  sortOrder: number;
  orderItemCount: number;
  prices?: AdminProductPrice[];
  createdAt: string;
  updatedAt: string;
}

export async function listAdminHostingPlans(): Promise<AdminHostingPlan[]> {
  const res = await apiClient.request<AdminHostingPlan[]>("/admin/hosting/plans");
  return res.data ?? [];
}

export async function getAdminHostingPlan(id: string): Promise<AdminHostingPlan> {
  const res = await apiClient.request<AdminHostingPlan>(`/admin/hosting/plans/${id}`);
  return res.data as AdminHostingPlan;
}

export async function createAdminHostingPlan(
  input: Omit<
    AdminHostingPlan,
    "id" | "slug" | "accountCount" | "createdAt" | "updatedAt" | "server" | "currency" | "billingCycle"
  > & {
    serverId: string;
    currency?: string;
    billingCycle?: string;
  },
): Promise<AdminHostingPlan> {
  const res = await apiClient.request<AdminHostingPlan>("/admin/hosting/plans", {
    method: "POST",
    body: input,
  });
  return res.data as AdminHostingPlan;
}

export async function updateAdminHostingPlan(
  id: string,
  input: Partial<
    Omit<AdminHostingPlan, "id" | "slug" | "accountCount" | "createdAt" | "updatedAt" | "server">
  >,
): Promise<AdminHostingPlan> {
  const res = await apiClient.request<AdminHostingPlan>(`/admin/hosting/plans/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminHostingPlan;
}

export async function deleteAdminHostingPlan(id: string): Promise<void> {
  await apiClient.request(`/admin/hosting/plans/${id}`, { method: "DELETE" });
}

export async function listAdminServerPlans(): Promise<AdminServerPlan[]> {
  const res = await apiClient.request<AdminServerPlan[]>("/admin/servers/plans");
  return res.data ?? [];
}

export async function getAdminServerPlan(id: string): Promise<AdminServerPlan> {
  const res = await apiClient.request<AdminServerPlan>(`/admin/servers/plans/${id}`);
  return res.data as AdminServerPlan;
}

export async function createAdminServerPlan(
  input: Omit<AdminServerPlan, "id" | "serverCount" | "createdAt" | "updatedAt"> & { slug: string },
): Promise<AdminServerPlan> {
  const res = await apiClient.request<AdminServerPlan>("/admin/servers/plans", {
    method: "POST",
    body: input,
  });
  return res.data as AdminServerPlan;
}

export async function updateAdminServerPlan(
  id: string,
  input: Partial<Omit<AdminServerPlan, "id" | "slug" | "serverCount" | "createdAt" | "updatedAt">>,
): Promise<AdminServerPlan> {
  const res = await apiClient.request<AdminServerPlan>(`/admin/servers/plans/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminServerPlan;
}

export async function deleteAdminServerPlan(id: string): Promise<void> {
  await apiClient.request(`/admin/servers/plans/${id}`, { method: "DELETE" });
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const res = await apiClient.request<AdminProduct[]>("/admin/products");
  return res.data ?? [];
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  const res = await apiClient.request<AdminProduct>(`/admin/products/${id}`);
  return res.data as AdminProduct;
}

export async function createAdminProduct(
  input: Omit<
    AdminProduct,
    "id" | "slug" | "orderItemCount" | "createdAt" | "updatedAt" | "billingCycle"
  > & {
    billingCycle?: string;
    prices?: AdminProductPrice[];
  },
): Promise<AdminProduct> {
  const res = await apiClient.request<AdminProduct>("/admin/products", {
    method: "POST",
    body: input,
  });
  return res.data as AdminProduct;
}

export async function updateAdminProduct(
  id: string,
  input: Partial<Omit<AdminProduct, "id" | "slug" | "orderItemCount" | "createdAt" | "updatedAt">>,
): Promise<AdminProduct> {
  const res = await apiClient.request<AdminProduct>(`/admin/products/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminProduct;
}

export async function deleteAdminProduct(id: string): Promise<void> {
  await apiClient.request(`/admin/products/${id}`, { method: "DELETE" });
}
