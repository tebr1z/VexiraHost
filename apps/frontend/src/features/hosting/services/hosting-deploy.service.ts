import { apiClient } from "@/services/api-client";

export type DeployStack = "NEXTJS" | "NESTJS" | "DOTNET" | "DOCKER";
export type DeploySource = "GIT" | "DOCKER_IMAGE" | "UPLOAD";
export type DeployDomainMode = "PRIMARY" | "SUBDOMAIN";
export type DeployStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface TenantResources {
  accountId: string;
  ready: boolean;
  mock: boolean;
  checkedAt: string;
  hasDeployments?: boolean;
  memoryBytes: number | null;
  diskBytes: number | null;
  cpuPercent: number | null;
  appliedCpuPercent: number | null;
  appliedMemoryMb: number | null;
  appliedDiskGb: number | null;
  limits: { cpuPercent: number; memoryMb: number; diskGb: number; maxApps: number };
}

export async function getTenantResources(
  accountId: string,
  admin = false,
): Promise<TenantResources> {
  const result = await apiClient.request<TenantResources>(
    admin
      ? `/admin/hosting/accounts/${accountId}/resources`
      : `/hosting/${accountId}/deployments/resources`,
  );
  return result.data as TenantResources;
}

export interface DeploymentSummary {
  id: string;
  name: string;
  stack: DeployStack;
  source?: DeploySource;
  runtime?: "PM2" | "DOCKER";
  domainMode: DeployDomainMode;
  subdomain: string | null;
  deployDomain: string;
  repoUrl: string;
  imageRef?: string | null;
  branch: string;
  status: DeployStatus;
  stage: string | null;
  lastError: string | null;
  envVarsState?: "missing" | "readable" | "unreadable";
  lastDeployedAt: string | null;
  createdAt: string;
  latestRun: {
    id: string;
    status: DeployStatus;
    stage: string | null;
    log: string;
    startedAt: string;
    finishedAt: string | null;
  } | null;
}

export interface DeploymentDetail extends DeploymentSummary {
  hostingAccountId: string;
  rootDirectory: string | null;
  containerPort: number;
  hostPort: number;
  containerName: string | null;
  deployPath: string | null;
  envVars: Record<string, string> | null;
  runs: Array<{
    id: string;
    status: DeployStatus;
    stage: string | null;
    log: string;
    startedAt: string;
    finishedAt: string | null;
  }>;
}

export interface CreateDeploymentInput {
  name: string;
  stack: DeployStack;
  source?: DeploySource;
  domainMode: DeployDomainMode;
  subdomain?: string;
  repoUrl?: string;
  githubRepoFullName?: string;
  imageRef?: string;
  branch?: string;
  rootDirectory?: string;
  containerPort?: number;
  envVars?: Record<string, string>;
}

export async function listDeployments(accountId: string): Promise<DeploymentSummary[]> {
  const res = await apiClient.request<DeploymentSummary[]>(`/hosting/${accountId}/deployments`);
  return (res.data ?? []) as DeploymentSummary[];
}

export async function getDeployment(
  accountId: string,
  deploymentId: string,
): Promise<DeploymentDetail> {
  const res = await apiClient.request<DeploymentDetail>(
    `/hosting/${accountId}/deployments/${deploymentId}`,
  );
  return res.data as DeploymentDetail;
}

export async function createDeployment(
  accountId: string,
  input: CreateDeploymentInput,
): Promise<{
  id: string;
  deployDomain: string;
  status: DeployStatus;
  stage?: string | null;
  queuePosition?: number;
  message: string;
}> {
  const res = await apiClient.request<{
    id: string;
    deployDomain: string;
    status: DeployStatus;
    stage?: string | null;
    queuePosition?: number;
    message: string;
  }>(`/hosting/${accountId}/deployments`, { method: "POST", body: input });
  return res.data!;
}

export async function createUploadDeployment(
  accountId: string,
  input: Omit<CreateDeploymentInput, "source" | "repoUrl" | "githubRepoFullName" | "imageRef">,
  file: File,
): Promise<{
  id: string;
  deployDomain: string;
  status: DeployStatus;
  stage?: string | null;
  queuePosition?: number;
  message: string;
}> {
  const form = new FormData();
  form.append("file", file);
  form.append("name", input.name);
  form.append("stack", input.stack);
  form.append("domainMode", input.domainMode);
  if (input.subdomain) form.append("subdomain", input.subdomain);
  if (input.rootDirectory) form.append("rootDirectory", input.rootDirectory);
  if (input.containerPort != null) form.append("containerPort", String(input.containerPort));
  if (input.envVars) form.append("envVarsJson", JSON.stringify(input.envVars));

  const res = await apiClient.request<{
    id: string;
    deployDomain: string;
    status: DeployStatus;
    stage?: string | null;
    queuePosition?: number;
    message: string;
  }>(`/hosting/${accountId}/deployments/upload`, { method: "POST", body: form });
  return res.data!;
}

export async function redeployApplication(
  accountId: string,
  deploymentId: string,
): Promise<{ id: string; message: string; queuePosition?: number }> {
  const res = await apiClient.request<{ id: string; message: string; queuePosition?: number }>(
    `/hosting/${accountId}/deployments/${deploymentId}/redeploy`,
    { method: "POST", body: {} },
  );
  return res.data!;
}

export async function deleteDeployment(
  accountId: string,
  deploymentId: string,
): Promise<{ id: string; message: string }> {
  const res = await apiClient.request<{ id: string; message: string }>(
    `/hosting/${accountId}/deployments/${deploymentId}`,
    { method: "DELETE" },
  );
  return res.data!;
}

export async function updateDeploymentEnv(
  accountId: string,
  deploymentId: string,
  envVars: Record<string, string>,
  redeploy = false,
  replaceUnreadableEnv = false,
): Promise<{
  id: string;
  message: string;
  containerPort?: number;
  ignoredPort?: string | null;
  queuePosition?: number;
}> {
  const res = await apiClient.request<{
    id: string;
    message: string;
    containerPort?: number;
    ignoredPort?: string | null;
    queuePosition?: number;
  }>(`/hosting/${accountId}/deployments/${deploymentId}/env`, {
    method: "PATCH",
    body: { envVars, redeploy, replaceUnreadableEnv },
  });
  return res.data!;
}

export interface DeployHealthCheckItem {
  id: "container" | "port" | "domain" | "public";
  ok: boolean;
  label: string;
  detail: string;
}

export interface DeployHealthResult {
  ok: boolean;
  checkedAt: string;
  hostPort: number;
  containerPort: number;
  containerName: string | null;
  deployDomain: string;
  checks: DeployHealthCheckItem[];
}

export async function checkDeploymentHealth(
  accountId: string,
  deploymentId: string,
): Promise<DeployHealthResult> {
  const res = await apiClient.request<DeployHealthResult>(
    `/hosting/${accountId}/deployments/${deploymentId}/health`,
    { method: "POST", body: {} },
  );
  return res.data as DeployHealthResult;
}

export interface DeployContainerLogsResult {
  containerName: string;
  lines: number;
  logs: string;
  checkedAt: string;
}

export async function getDeploymentContainerLogs(
  accountId: string,
  deploymentId: string,
  lines = 100,
): Promise<DeployContainerLogsResult> {
  const res = await apiClient.request<DeployContainerLogsResult>(
    `/hosting/${accountId}/deployments/${deploymentId}/container-logs?lines=${lines}`,
  );
  return res.data as DeployContainerLogsResult;
}

export function formatEnvVars(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}
