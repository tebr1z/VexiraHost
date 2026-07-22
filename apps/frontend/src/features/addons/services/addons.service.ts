import { apiClient } from "@/services/api-client";

export type AddonType = "LICENSE" | "SSL" | "EMAIL" | "BACKUP";

export interface AddonService {
  id: string;
  type: AddonType;
  name: string;
  identifier: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  expiresAt: string | null;
  provisionedAt: string | null;
  createdAt: string;
}

export async function listAddons(): Promise<AddonService[]> {
  const res = await apiClient.request<AddonService[]>("/licenses");
  return res.data ?? [];
}

export async function provisionAddon(input: {
  type: AddonType;
  name: string;
  identifier?: string;
}): Promise<AddonService> {
  const res = await apiClient.request<AddonService>("/licenses/provision", {
    method: "POST",
    body: input,
  });
  return res.data as AddonService;
}
