import { apiClient } from "@/services/api-client";

import type { PublicCmsPage } from "../types";

export async function fetchCmsPage(slug: string, locale: string): Promise<PublicCmsPage | null> {
  try {
    const response = await apiClient.request<PublicCmsPage>(
      `/pages/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}
