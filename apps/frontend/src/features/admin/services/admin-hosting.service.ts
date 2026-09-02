import { apiClient } from "@/services/api-client";

export interface HostingServer {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  panel: "CPANEL" | "PLESK";
  whmUsername: string;
  osVersion: string | null;
  sshUsername: string | null;
  sshPort: number;
  sshPasswordConfigured: boolean;
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
  provisionStage: string | null;
  provisionError: string | null;
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
  osVersion?: string;
  sshUsername?: string;
  sshPassword?: string;
  sshPort?: number;
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
    osVersion: string | null;
    sshUsername: string | null;
    sshPassword: string;
    sshPort: number;
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
  return res.data as {
    ok: boolean;
    message: string;
    lastCheckedAt: string;
    lastConnectionOk: boolean;
  };
}

export interface PleskRemotePlan {
  id: string | null;
  name: string;
  diskGb: number;
  bandwidthGb: number;
  maxDomains: number;
  maxEmails: number;
  maxDatabases: number;
  unlimitedDisk: boolean;
  unlimitedBandwidth: boolean;
  alreadySynced: boolean;
  localPlanId: string | null;
  localSlug: string | null;
  localIsActive: boolean | null;
}

export interface SyncPleskPlansResult {
  created: number;
  updated: number;
  total: number;
  plans: Array<{ id: string; slug: string; name: string; action: "created" | "updated" }>;
}

export async function listRemotePleskPlans(serverId: string): Promise<PleskRemotePlan[]> {
  const res = await apiClient.request<PleskRemotePlan[]>(
    `/admin/hosting/servers/${serverId}/plesk-plans`,
  );
  return res.data ?? [];
}

export async function syncPleskPlansFromServer(serverId: string): Promise<SyncPleskPlansResult> {
  const res = await apiClient.request<SyncPleskPlansResult>(
    `/admin/hosting/servers/${serverId}/sync-plans`,
    { method: "POST" },
  );
  return res.data as SyncPleskPlansResult;
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

export async function retryAdminHostingProvision(id: string): Promise<AdminHostingAccount> {
  const res = await apiClient.request<AdminHostingAccount>(
    `/admin/hosting/accounts/${id}/retry-provision`,
    { method: "POST" },
  );
  return res.data as AdminHostingAccount;
}

export async function reassignAdminHostingProvision(
  id: string,
  targetServerId: string,
): Promise<AdminHostingAccount> {
  const res = await apiClient.request<AdminHostingAccount>(
    `/admin/hosting/accounts/${id}/reassign-provision`,
    { method: "POST", body: { targetServerId } },
  );
  return res.data as AdminHostingAccount;
}

export interface ServerSetupStatus {
  server: {
    id: string;
    name: string;
    hostname: string;
    ipAddress: string;
    panel: string;
    osVersion: string | null;
    sshUsername: string | null;
    sshPort: number;
    sshConfigured: boolean;
  };
  mockRemote: boolean;
  tools: {
    git: string | null;
    docker: string | null;
    compose: string | null;
    os: string | null;
    probedAt: string;
  } | null;
  lastBootstrapLog: string | null;
  activeBootstrapJobId: string | null;
}

export type BootstrapJobStep = {
  id: string;
  status: "pending" | "running" | "success" | "failed";
  message?: string;
};

export type BootstrapJob = {
  id: string;
  serverId: string;
  status: "running" | "success" | "failed";
  currentStage: string;
  steps: BootstrapJobStep[];
  log: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export async function getServerSetupStatus(serverId: string): Promise<ServerSetupStatus> {
  const res = await apiClient.request<ServerSetupStatus>(
    `/admin/hosting/servers/${serverId}/setup`,
  );
  return res.data as ServerSetupStatus;
}

export async function probeServerSetup(serverId: string): Promise<ServerSetupStatus> {
  const res = await apiClient.request<ServerSetupStatus>(
    `/admin/hosting/servers/${serverId}/setup/probe`,
    { method: "POST" },
  );
  return res.data as ServerSetupStatus;
}

export async function testServerSetupSsh(
  serverId: string,
): Promise<{ ok: boolean; message: string; output: string }> {
  const res = await apiClient.request<{ ok: boolean; message: string; output: string }>(
    `/admin/hosting/servers/${serverId}/setup/test-ssh`,
    { method: "POST" },
  );
  return res.data as { ok: boolean; message: string; output: string };
}

export async function bootstrapServerSetup(serverId: string): Promise<{ jobId: string }> {
  const res = await apiClient.request<{ jobId: string }>(
    `/admin/hosting/servers/${serverId}/setup/bootstrap`,
    { method: "POST" },
  );
  return res.data as { jobId: string };
}

export async function getBootstrapJob(serverId: string, jobId: string): Promise<BootstrapJob> {
  const res = await apiClient.request<BootstrapJob>(
    `/admin/hosting/servers/${serverId}/setup/bootstrap/${jobId}`,
  );
  return res.data as BootstrapJob;
}
