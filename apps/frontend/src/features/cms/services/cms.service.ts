import type { PublicCmsChildPage, PublicCmsPage } from "../types";

import { apiClient } from "@/services/api-client";

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

export async function fetchCmsPageByPath(
  pathSegment: string,
  locale: string,
): Promise<PublicCmsPage | null> {
  try {
    const response = await apiClient.request<PublicCmsPage>(
      `/pages/by-path/${encodeURIComponent(pathSegment)}?locale=${encodeURIComponent(locale)}`,
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchCmsChildPages(
  parentSlug: string,
  locale: string,
): Promise<PublicCmsChildPage[]> {
  try {
    const response = await apiClient.request<PublicCmsChildPage[]>(
      `/pages/children?parentSlug=${encodeURIComponent(parentSlug)}&locale=${encodeURIComponent(locale)}`,
    );
    return response.data ?? [];
  } catch {
    return [];
  }
}
