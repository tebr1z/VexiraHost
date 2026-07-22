import { apiClient } from "@/services/api-client";

export interface HostingServer {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  panel: "CPANEL" | "PLESK";
  whmUsername: string;
  isDefault: boolean;
  isActive: boolean;
  maxAccounts: number | null;
  accountCount: number;
  activeAccountCount: number;
  lastCheckedAt: string | null;
  lastConnectionOk: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHostingAccount {
  id: string;
  primaryDomain: string;
  username: string;
  panel: string;
  status: string;
  panelUrl: string | null;
  provisionedAt: string | null;
  createdAt: string;
  plan: { id: string; slug: string; name: string };
  server: {
    id: string;
    name: string;
    ipAddress: string;
    panel?: string;
    isActive?: boolean;
  } | null;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export async function listHostingServers(): Promise<HostingServer[]> {
  const res = await apiClient.request<HostingServer[]>("/admin/hosting/servers");
  return res.data ?? [];
}

export async function getHostingServer(id: string): Promise<HostingServer> {
  const res = await apiClient.request<HostingServer>(`/admin/hosting/servers/${id}`);
  return res.data as HostingServer;
}

export async function createHostingServer(input: {
  name: string;
  hostname: string;
  ipAddress: string;
  panel: "CPANEL" | "PLESK";
  whmUsername: string;
  whmPassword: string;
  apiToken?: string;
  isDefault?: boolean;
  isActive?: boolean;
  maxAccounts?: number;
}): Promise<HostingServer> {
  const res = await apiClient.request<HostingServer>("/admin/hosting/servers", {
    method: "POST",
    body: input,
  });
  return res.data as HostingServer;
}

export async function updateHostingServer(
  id: string,
  input: Partial<{
    name: string;
    hostname: string;
    ipAddress: string;
    panel: "CPANEL" | "PLESK";
    whmUsername: string;
    whmPassword: string;
    apiToken: string | null;
    isDefault: boolean;
    isActive: boolean;
    maxAccounts: number | null;
  }>,
): Promise<HostingServer> {
  const res = await apiClient.request<HostingServer>(`/admin/hosting/servers/${id}`, {
    method: "PATCH",
    body: input,
  });
  return res.data as HostingServer;
}

export async function deleteHostingServer(id: string): Promise<void> {
  await apiClient.request(`/admin/hosting/servers/${id}`, { method: "DELETE" });
}

export async function testHostingServer(
  id: string,
): Promise<{ ok: boolean; message: string; lastCheckedAt: string; lastConnectionOk: boolean }> {
  const res = await apiClient.request<{
    ok: boolean;
    message: string;
    lastCheckedAt: string;
    lastConnectionOk: boolean;
  }>(`/admin/hosting/servers/${id}/test`, { method: "POST" });
  return res.data as { ok: boolean; message: string; lastCheckedAt: string; lastConnectionOk: boolean };
}

export async function listHostingServerAccounts(
  id: string,
  activeOnly = true,
): Promise<AdminHostingAccount[]> {
  const res = await apiClient.request<AdminHostingAccount[]>(
    `/admin/hosting/servers/${id}/accounts?activeOnly=${activeOnly ? "true" : "false"}`,
  );
  return res.data ?? [];
}

export async function listAdminHostingAccounts(): Promise<AdminHostingAccount[]> {
  const res = await apiClient.request<AdminHostingAccount[]>("/admin/hosting/accounts");
  return res.data ?? [];
}

export async function updateAdminHostingAccountStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<AdminHostingAccount> {
  const res = await apiClient.request<AdminHostingAccount>(`/admin/hosting/accounts/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  return res.data as AdminHostingAccount;
}

export async function deleteAdminHostingAccount(id: string): Promise<void> {
  await apiClient.request(`/admin/hosting/accounts/${id}`, { method: "DELETE" });
}

export async function migrateAdminHostingAccounts(
  accountIds: string[],
  targetServerId: string,
): Promise<{ migrated: number; failed: number }> {
  const res = await apiClient.request<{ migrated: number; failed: number }>(
    "/admin/hosting/accounts/migrate",
    {
      method: "POST",
      body: { accountIds, targetServerId },
    },
  );
  return res.data as { migrated: number; failed: number };
}
