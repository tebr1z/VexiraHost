import { apiClient } from "@/services/api-client";

export interface NavLabels {
  tr: string;
  en?: string;
  az?: string;
  ru?: string;
}

export interface PublicNavItem {
  id: string;
  label: string;
  href: string;
  pathMatch?: string;
}

export interface PublicNavGroup {
  key: string;
  label: string;
  items: PublicNavItem[];
}

export async function listPublicNavigation(locale: string): Promise<PublicNavGroup[]> {
  const res = await apiClient.request<PublicNavGroup[]>(
    `/navigation?locale=${encodeURIComponent(locale)}`,
  );
  return res.data ?? [];
}
