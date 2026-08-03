import type { CatalogCategory, CatalogProduct } from "../types";

import { apiClient } from "@/services/api-client";

export async function listCatalogProducts(options?: {
  category?: string;
  currency?: string;
  period?: string;
}): Promise<CatalogProduct[]> {
  const params = new URLSearchParams();
  if (options?.category) params.set("category", options.category);
  if (options?.currency) params.set("currency", options.currency);
  if (options?.period) params.set("period", options.period);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiClient.request<CatalogProduct[]>(`/catalog/products${query}`);
  return res.data ?? [];
}

export async function listCatalogCategories(locale?: string): Promise<CatalogCategory[]> {
  const params = new URLSearchParams();
  if (locale) params.set("locale", locale);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiClient.request<CatalogCategory[]>(`/catalog/categories${query}`);
  return res.data ?? [];
}

export async function getCatalogProduct(
  slug: string,
  options?: { currency?: string; period?: string },
): Promise<CatalogProduct> {
  const params = new URLSearchParams();
  if (options?.currency) params.set("currency", options.currency);
  if (options?.period) params.set("period", options.period);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiClient.request<CatalogProduct>(`/catalog/products/${slug}${query}`);
  return res.data as CatalogProduct;
}
