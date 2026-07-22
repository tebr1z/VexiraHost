import { apiClient } from "@/services/api-client";

export interface ServerPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: "VPS" | "DEDICATED";
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  bandwidthGbps: number;
  price: number;
  currency: string;
  billingCycle: string;
  regions: string[];
}

export interface ServerInstance {
  id: string;
  hostname: string;
  displayName: string;
  type: "VPS" | "DEDICATED";
  status: string;
  region: string;
  regionLabel: string;
  ipv4: string | null;
  osTemplate: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  proxmoxVmId: string | null;
  proxmoxNode: string | null;
  provisionedAt: string | null;
  createdAt: string;
  plan: ServerPlan;
}

export interface ServerMetrics {
  cpuPercent: number;
  cpuTrend: number;
  cpuHistory: number[];
  ramUsedGb: number;
  ramTotalGb: number;
  ramBufferedGb: number;
  ramCacheGb: number;
  diskIoMbps: number;
  diskIops: number;
}

export type PowerAction = "START" | "STOP" | "REBOOT" | "SHUTDOWN";

export async function listServerPlans(type?: "VPS" | "DEDICATED"): Promise<ServerPlan[]> {
  const res = await apiClient.request<ServerPlan[]>("/servers/plans", {
    params: type ? { type } : undefined,
  });
  return res.data ?? [];
}

export async function listServers(): Promise<ServerInstance[]> {
  const res = await apiClient.request<ServerInstance[]>("/servers");
  return res.data ?? [];
}

export async function getServer(id: string): Promise<ServerInstance> {
  const res = await apiClient.request<ServerInstance>(`/servers/${id}`);
  return res.data as ServerInstance;
}

export async function getServerMetrics(id: string): Promise<ServerMetrics> {
  const res = await apiClient.request<ServerMetrics>(`/servers/${id}/metrics`);
  return res.data as ServerMetrics;
}

export async function provisionServer(input: {
  planSlug: string;
  hostname: string;
  displayName?: string;
  region: string;
  osTemplate?: string;
}): Promise<ServerInstance> {
  const res = await apiClient.request<ServerInstance>("/servers/provision", {
    method: "POST",
    body: input,
  });
  return res.data as ServerInstance;
}

export async function serverPowerAction(
  id: string,
  action: PowerAction,
): Promise<{ server: ServerInstance; action: PowerAction }> {
  const res = await apiClient.request<{ server: ServerInstance; action: PowerAction }>(
    `/servers/${id}/power`,
    { method: "POST", body: { action } },
  );
  return res.data as { server: ServerInstance; action: PowerAction };
}

export const REGION_LABELS: Record<string, string> = {
  "fra-01": "Frankfurt (FRA-01)",
  "nyc-01": "New York (NYC-01)",
  "sin-01": "Singapore (SIN-01)",
};

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

export function statusColor(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case "RUNNING":
      return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    case "STOPPED":
      return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    case "PROVISIONING":
      return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
    case "ERROR":
      return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
    default:
      return { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" };
  }
}
