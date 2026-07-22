import { apiClient } from "@/services/api-client";

import type {
  AdminCmsPage,
  AdminCmsPageSummary,
  AdminCmsSection,
  CmsDesign,
  CmsSectionType,
  I18nText,
} from "@/features/cms/types";

export async function listAdminCmsPages(): Promise<AdminCmsPageSummary[]> {
  const response = await apiClient.request<AdminCmsPageSummary[]>("/admin/cms/pages");
  return response.data ?? [];
}

export async function getAdminCmsPage(slug: string): Promise<AdminCmsPage> {
  const response = await apiClient.request<AdminCmsPage>(`/admin/cms/pages/${encodeURIComponent(slug)}`);
  return response.data as AdminCmsPage;
}

export async function createAdminCmsSection(
  pageSlug: string,
  input: {
    key: string;
    type: CmsSectionType;
    content: Record<string, unknown>;
    design?: CmsDesign;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<AdminCmsSection> {
  const response = await apiClient.request<AdminCmsSection>(
    `/admin/cms/pages/${encodeURIComponent(pageSlug)}/sections`,
    { method: "POST", body: input },
  );
  return response.data as AdminCmsSection;
}

export async function updateAdminCmsSection(
  sectionId: string,
  input: Partial<{
    key: string;
    type: CmsSectionType;
    content: Record<string, unknown>;
    design: CmsDesign;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<AdminCmsSection> {
  const response = await apiClient.request<AdminCmsSection>(`/admin/cms/sections/${sectionId}`, {
    method: "PATCH",
    body: input,
  });
  return response.data as AdminCmsSection;
}

export async function deleteAdminCmsSection(sectionId: string): Promise<void> {
  await apiClient.request(`/admin/cms/sections/${sectionId}`, { method: "DELETE" });
}

export async function reorderAdminCmsSections(
  pageSlug: string,
  sectionIds: string[],
): Promise<AdminCmsPage> {
  const response = await apiClient.request<AdminCmsPage>(
    `/admin/cms/pages/${encodeURIComponent(pageSlug)}/sections/reorder`,
    { method: "PUT", body: { sectionIds } },
  );
  return response.data as AdminCmsPage;
}

export type { I18nText, CmsSectionType, CmsDesign };
