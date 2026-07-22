import { Injectable } from "@nestjs/common";
import { ServerPowerAction, ServerStatus } from "@prisma/client";

import type {
  ProxmoxMetrics,
  ProxmoxProvisionInput,
  ProxmoxProvisionResult,
  ProxmoxProvider,
} from "../interfaces/proxmox-provider.interface";

const REGION_NODES: Record<string, string> = {
  "fra-01": "pve-fra-01",
  "nyc-01": "pve-nyc-01",
  "sin-01": "pve-sin-01",
};

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash + input.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash;
}

@Injectable()
export class MockProxmoxProvider implements ProxmoxProvider {
  async provision(input: ProxmoxProvisionInput): Promise<ProxmoxProvisionResult> {
    const vmId = String(1000 + (hashSeed(input.hostname) % 8000));
    const node = REGION_NODES[input.region] ?? "pve-fra-01";
    const octet = (hashSeed(input.hostname) % 200) + 10;

    return {
      vmId,
      node,
      ipv4: `45.12.${octet}.${(hashSeed(input.hostname) % 250) + 1}`,
      status: ServerStatus.RUNNING,
    };
  }

  async powerAction(
    _vmId: string,
    _node: string,
    action: ServerPowerAction,
    currentStatus: ServerStatus,
  ): Promise<ServerStatus> {
    if (currentStatus === ServerStatus.PROVISIONING) {
      throw new Error("Server is still provisioning");
    }
    if (currentStatus === ServerStatus.SUSPENDED) {
      throw new Error("Server is suspended");
    }

    switch (action) {
      case ServerPowerAction.START:
        return ServerStatus.RUNNING;
      case ServerPowerAction.STOP:
      case ServerPowerAction.SHUTDOWN:
        return ServerStatus.STOPPED;
      case ServerPowerAction.REBOOT:
        return ServerStatus.RUNNING;
      default:
        return currentStatus;
    }
  }

  getMetrics(serverId: string, ramTotalGb: number): ProxmoxMetrics {
    const seed = hashSeed(serverId);
    const cpuPercent = 12 + (seed % 55);
    const ramUsedGb = Math.round(((seed % 70) / 100) * ramTotalGb * 10) / 10;
    const cpuHistory = Array.from({ length: 11 }, (_, i) => 15 + ((seed + i * 7) % 50));

    return {
      cpuPercent,
      cpuTrend: ((seed % 10) - 4) / 2,
      cpuHistory,
      ramUsedGb: Math.max(0.5, ramUsedGb),
      ramTotalGb,
      ramBufferedGb: Math.round(ramUsedGb * 0.17 * 10) / 10,
      ramCacheGb: Math.round(ramUsedGb * 0.38 * 10) / 10,
      diskIoMbps: 40 + (seed % 180),
      diskIops: 20 + (seed % 120),
    };
  }
}
