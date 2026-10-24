import type { ProjectPricingConfig, ProjectPricingDocument } from "@vexira/types";

import { apiClient } from "@/services/api-client";

export async function getAdminProjectPricing(): Promise<ProjectPricingDocument> {
  const response = await apiClient.request<ProjectPricingDocument>("/admin/project-pricing");
  if (!response.data) throw new Error("Project pricing unavailable");
  return response.data;
}
export async function saveAdminProjectPricing(
  config: ProjectPricingConfig,
  expectedUpdatedAt: string | null,
): Promise<ProjectPricingDocument> {
  const response = await apiClient.request<ProjectPricingDocument>("/admin/project-pricing", {
    method: "PUT",
    body: { config, expectedUpdatedAt },
  });
  if (!response.data) throw new Error("Project pricing unavailable");
  return response.data;
}
