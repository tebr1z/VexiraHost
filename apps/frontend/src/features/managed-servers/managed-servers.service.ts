import { apiClient } from "@/services/api-client";

export type ManagedServerFeature =
  "GIT" | "DOCKER" | "NODEJS" | "PM2" | "NGINX" | "UFW" | "FAIL2BAN" | "PLESK";

export type ManagedServerTaskStatus =
  "QUEUED" | "RUNNING" | "WAITING_APPROVAL" | "SUCCESS" | "FAILED";

export interface ManagedServerCatalog {
  packages: Array<{
    code: string;
    name: string;
    description: string;
    features: ManagedServerFeature[];
  }>;
  features: ManagedServerFeature[];
}

export interface ManagedServerFinding {
  id: string;
  key: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACCEPTED" | "FIXED";
  title: string;
  description: string;
  remediation: string | null;
  autoFixAvailable: boolean;
  detectedAt: string;
}

export interface ManagedServerTask {
  id: string;
  type: "CONNECTION_CHECK" | "INSTALL" | "SECURITY_SCAN" | "OPTIMIZATION_SCAN" | "SECURITY_FIX";
  status: ManagedServerTaskStatus;
  requestedFeatures: ManagedServerFeature[];
  log: string;
  result: Record<string, unknown> | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ManagedServer {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPasswordConfigured: boolean;
  packageCode: string;
  selectedFeatures: ManagedServerFeature[];
  installedFeatures: ManagedServerFeature[];
  status: "PENDING" | "ONLINE" | "DEGRADED" | "OFFLINE" | "ERROR";
  osVersion: string | null;
  tools: Record<string, string | null> | null;
  cpuLoadPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  diskUsedMb: number | null;
  diskTotalMb: number | null;
  uptimeSeconds: number | null;
  securityScore: number | null;
  optimizationScore: number | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  lastSecurityScanAt: string | null;
  lastOptimizationAt: string | null;
  monitoringEnabled: boolean;
  findings?: ManagedServerFinding[];
  tasks?: ManagedServerTask[];
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
}

export interface CreateManagedServerInput {
  name: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPassword: string;
  packageCode: string;
  selectedFeatures: ManagedServerFeature[];
}

export async function getManagedServerCatalog(): Promise<ManagedServerCatalog> {
  const result = await apiClient.request<ManagedServerCatalog>("/managed-servers/catalog");
  return result.data!;
}

export async function listManagedServers(admin = false): Promise<ManagedServer[]> {
  const result = await apiClient.request<ManagedServer[]>(
    admin ? "/admin/managed-servers" : "/managed-servers",
  );
  return result.data ?? [];
}

export async function createManagedServer(input: CreateManagedServerInput): Promise<ManagedServer> {
  const result = await apiClient.request<ManagedServer>("/managed-servers", {
    method: "POST",
    body: input,
  });
  return result.data!;
}

export async function runManagedServerAction(
  serverId: string,
  action: "check" | "security-scan" | "optimization-scan",
): Promise<{ taskId: string; status: ManagedServerTaskStatus }> {
  const result = await apiClient.request<{ taskId: string; status: ManagedServerTaskStatus }>(
    `/managed-servers/${serverId}/${action}`,
    { method: "POST", body: {} },
  );
  return result.data!;
}

export async function installManagedServerFeatures(
  serverId: string,
  features: ManagedServerFeature[],
): Promise<{ taskId: string; status: ManagedServerTaskStatus; requiresAdminApproval: boolean }> {
  const result = await apiClient.request<{
    taskId: string;
    status: ManagedServerTaskStatus;
    requiresAdminApproval: boolean;
  }>(`/managed-servers/${serverId}/install`, {
    method: "POST",
    body: { features, confirmChanges: true },
  });
  return result.data!;
}

export async function fixManagedServerFinding(serverId: string, findingId: string) {
  const result = await apiClient.request<{ taskId: string; status: ManagedServerTaskStatus }>(
    `/managed-servers/${serverId}/findings/${findingId}/fix`,
    { method: "POST", body: { confirmChanges: true } },
  );
  return result.data!;
}

export async function approveManagedServerTask(taskId: string) {
  const result = await apiClient.request<{ taskId: string; status: ManagedServerTaskStatus }>(
    `/admin/managed-servers/tasks/${taskId}/approve`,
    { method: "POST", body: {} },
  );
  return result.data!;
}
