import { apiClient } from "@/services/api-client";

export type DeployStack = "NEXTJS" | "NESTJS";
export type DeployDomainMode = "PRIMARY" | "SUBDOMAIN";
export type DeployStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface DeploymentSummary {
  id: string;
  name: string;
  stack: DeployStack;
  domainMode: DeployDomainMode;
  subdomain: string | null;
  deployDomain: string;
  repoUrl: string;
  branch: string;
  status: DeployStatus;
  stage: string | null;
  lastError: string | null;
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
  domainMode: DeployDomainMode;
  subdomain?: string;
  repoUrl: string;
  branch?: string;
  rootDirectory?: string;
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
): Promise<{ id: string; deployDomain: string; status: DeployStatus; message: string }> {
  const res = await apiClient.request<{
    id: string;
    deployDomain: string;
    status: DeployStatus;
    message: string;
  }>(`/hosting/${accountId}/deployments`, { method: "POST", body: input });
  return res.data!;
}

export async function redeployApplication(
  accountId: string,
  deploymentId: string,
): Promise<{ id: string; message: string }> {
  const res = await apiClient.request<{ id: string; message: string }>(
    `/hosting/${accountId}/deployments/${deploymentId}/redeploy`,
    { method: "POST", body: {} },
  );
  return res.data!;
}
