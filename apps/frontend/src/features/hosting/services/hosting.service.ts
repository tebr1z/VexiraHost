import { apiClient } from "@/services/api-client";

export interface HostingPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  panel: "CPANEL" | "PLESK";
  diskGb: number;
  bandwidthGb: number;
  maxDomains: number;
  maxEmails: number;
  maxDatabases: number;
  price: number;
  currency: string;
  billingCycle: string;
}

export interface HostingServerSummary {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  panel: string;
}

export interface PleskWebspaceInfo {
  subscriptionId: string | null;
  domain: string | null;
  status: "active" | "suspended" | "unknown";
  ownerId: string | null;
  ipAddress: string | null;
  diskUsedBytes: number | null;
  diskLimitBytes: number | null;
  trafficUsedBytes: number | null;
  trafficLimitBytes: number | null;
  maxDomains: number | null;
  maxMailboxes: number | null;
  maxDatabases: number | null;
  ftpLogin: string | null;
  hostingType: string | null;
  diskUsage: Record<string, number>;
  syncedAt: string;
}

export interface HostingAccount {
  id: string;
  primaryDomain: string;
  username: string;
  panel: string;
  status: string;
  panelUrl: string | null;
  panelUsername: string | null;
  panelRef: string | null;
  server: HostingServerSummary | null;
  orderId: string | null;
  provisionedAt: string | null;
  provisionStage: string | null;
  provisionError: string | null;
  createdAt: string;
  plan: HostingPlan;
  pleskInfo: PleskWebspaceInfo | null;
}

export async function listHostingPlans(): Promise<HostingPlan[]> {
  const res = await apiClient.request<HostingPlan[]>("/hosting/plans");
  return res.data ?? [];
}

export async function listHostingAccounts(): Promise<HostingAccount[]> {
  const res = await apiClient.request<HostingAccount[]>("/hosting");
  return res.data ?? [];
}

export async function getHostingAccount(id: string): Promise<HostingAccount> {
  const res = await apiClient.request<HostingAccount>(`/hosting/${id}`);
  return res.data as HostingAccount;
}

export async function retryHostingProvision(id: string): Promise<HostingAccount> {
  const res = await apiClient.request<HostingAccount>(`/hosting/${id}/retry-provision`, {
    method: "POST",
  });
  return res.data as HostingAccount;
}

export async function syncHostingPanelInfo(id: string): Promise<HostingAccount> {
  const res = await apiClient.request<HostingAccount>(`/hosting/${id}/sync-panel-info`, {
    method: "POST",
  });
  return res.data as HostingAccount;
}

export async function resolveClientPublicIp(): Promise<string | undefined> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { ip?: string };
    return data.ip;
  } catch {
    return undefined;
  }
}

export async function openHostingPanel(id: string): Promise<void> {
  const clientIp = await resolveClientPublicIp();
  const res = await apiClient.request<{ openUrl: string }>(`/hosting/${id}/panel-login`, {
    method: "POST",
    body: clientIp ? { clientIp } : {},
  });
  const openUrl = res.data?.openUrl;
  if (!openUrl) throw new Error("Panel login URL missing");
  window.open(openUrl, "_blank", "noopener,noreferrer");
}

export async function provisionHosting(input: {
  planSlug: string;
  primaryDomain: string;
}): Promise<HostingAccount> {
  const res = await apiClient.request<HostingAccount>("/hosting/provision", {
    method: "POST",
    body: input,
  });
  return res.data as HostingAccount;
}
