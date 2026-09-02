import { apiClient } from "@/services/api-client";

export interface GitHubDeployStatus {
  connected: boolean;
  githubLogin?: string;
  connectedAt?: string;
}

export interface GitHubRepoSummary {
  id: number;
  fullName: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl: string;
  updatedAt: string;
}

export async function getGitHubDeployStatus(): Promise<GitHubDeployStatus> {
  const res = await apiClient.request<GitHubDeployStatus>("/deploy/github/status");
  return res.data ?? { connected: false };
}

export async function getGitHubConnectUrl(returnTo: string): Promise<string> {
  const res = await apiClient.request<{ url: string }>("/deploy/github/connect-url", {
    method: "POST",
    body: { returnTo },
  });
  return res.data?.url ?? "";
}

export async function listGitHubRepos(page = 1): Promise<{
  repos: GitHubRepoSummary[];
  hasMore: boolean;
}> {
  const res = await apiClient.request<{ repos: GitHubRepoSummary[]; hasMore: boolean }>(
    `/deploy/github/repos?page=${page}`,
  );
  return res.data ?? { repos: [], hasMore: false };
}

export async function disconnectGitHub(): Promise<void> {
  await apiClient.request("/deploy/github/connection", { method: "DELETE" });
}
