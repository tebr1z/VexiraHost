import "server-only";
import { cache } from "react";

import type { CatalogCategory, CatalogProduct } from "@/features/catalog";
import type { HostingPlan } from "@/features/hosting";

const base = () =>
  (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api/v1"
  ).replace(/\/$/, "");
async function publicData<T>(path: string): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Public catalog unavailable (${response.status})`);
  const payload = await response.json();
  return payload.data as T;
}
export const publicProducts = cache(() =>
  publicData<CatalogProduct[]>("/catalog/products?currency=USD&period=MONTHLY"),
);
export const publicPlans = cache(() => publicData<HostingPlan[]>("/hosting/plans"));

export const publicCategories = cache((locale = "en") =>
  publicData<CatalogCategory[]>(`/catalog/categories?locale=${encodeURIComponent(locale)}`),
);
