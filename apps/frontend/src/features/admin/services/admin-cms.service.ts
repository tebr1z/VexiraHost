import type {
  AdminCmsPage,
  AdminCmsPageSummary,
  AdminCmsSection,
  CmsDesign,
  CmsSectionType,
  I18nText,
} from "@/features/cms/types";
import { apiClient } from "@/services/api-client";

export async function listAdminCmsPages(): Promise<AdminCmsPageSummary[]> {
  const response = await apiClient.request<AdminCmsPageSummary[]>("/admin/cms/pages");
  return response.data ?? [];
}

export async function getAdminCmsPage(slug: string): Promise<AdminCmsPage> {
  const response = await apiClient.request<AdminCmsPage>(
    `/admin/cms/pages/${encodeURIComponent(slug)}`,
  );
  return response.data as AdminCmsPage;
}

export async function createAdminCmsPage(input: {
  slug: string;
  title: I18nText;
  parentSlug?: string;
  pathSegment?: string;
  sortOrder?: number;
  template?: "license-catalog";
  productSlugs?: string[];
  isActive?: boolean;
}): Promise<AdminCmsPage> {
  const response = await apiClient.request<AdminCmsPage>("/admin/cms/pages", {
    method: "POST",
    body: input,
  });
  return response.data as AdminCmsPage;
}

export async function deleteAdminCmsPage(slug: string): Promise<void> {
  await apiClient.request(`/admin/cms/pages/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export const LICENSE_CMS_SECTIONS = [
  { slug: "licenses-windows", labelKey: "sectionWindows", pathPrefix: "windows" },
  { slug: "licenses-server", labelKey: "sectionServer", pathPrefix: "server" },
  { slug: "licenses-office", labelKey: "sectionOffice", pathPrefix: "office" },
  { slug: "licenses-antivirus", labelKey: "sectionAntivirus", pathPrefix: "antivirus" },
] as const;

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
