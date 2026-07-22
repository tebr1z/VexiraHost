import type { ServerPowerAction, ServerStatus } from "@prisma/client";

export interface ProxmoxProvisionInput {
  hostname: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  region: string;
  osTemplate: string;
}

export interface ProxmoxProvisionResult {
  vmId: string;
  node: string;
  ipv4: string;
  status: ServerStatus;
}

export interface ProxmoxMetrics {
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

export interface ProxmoxProvider {
  provision(input: ProxmoxProvisionInput): Promise<ProxmoxProvisionResult>;
  powerAction(
    vmId: string,
    node: string,
    action: ServerPowerAction,
    currentStatus: ServerStatus,
  ): Promise<ServerStatus>;
  getMetrics(serverId: string, ramTotalGb: number): ProxmoxMetrics;
}
