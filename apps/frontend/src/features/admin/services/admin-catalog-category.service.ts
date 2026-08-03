import { apiClient } from "@/services/api-client";

export interface AdminCatalogCategory {
  id: string;
  slug: string;
  name: string;
  names: Record<string, string> | null;
  sortOrder: number;
  isActive: boolean;
  systemType: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminCatalogCategoryInput = {
  slug: string;
  name: string;
  names?: Record<string, string> | null;
  sortOrder?: number;
  isActive?: boolean;
  systemType?: string | null;
};

export async function listAdminCatalogCategories(): Promise<AdminCatalogCategory[]> {
  const res = await apiClient.request<AdminCatalogCategory[]>("/admin/catalog-categories");
  return res.data ?? [];
}

export async function getAdminCatalogCategory(id: string): Promise<AdminCatalogCategory> {
  const res = await apiClient.request<AdminCatalogCategory>(`/admin/catalog-categories/${id}`);
  return res.data as AdminCatalogCategory;
}

export async function createAdminCatalogCategory(
  input: AdminCatalogCategoryInput,
): Promise<AdminCatalogCategory> {
  const res = await apiClient.request<AdminCatalogCategory>("/admin/catalog-categories", {
    method: "POST",
    body: input,
  });
  return res.data as AdminCatalogCategory;
}

export async function updateAdminCatalogCategory(
  id: string,
  input: Partial<AdminCatalogCategoryInput>,
): Promise<AdminCatalogCategory> {
  const res = await apiClient.request<AdminCatalogCategory>(`/admin/catalog-categories/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as AdminCatalogCategory;
}

export async function deleteAdminCatalogCategory(id: string): Promise<void> {
  await apiClient.request(`/admin/catalog-categories/${id}`, { method: "DELETE" });
}
