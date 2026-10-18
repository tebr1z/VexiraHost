import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ServerPowerAction, ServerStatus } from "@prisma/client";

import type {
  ProxmoxMetrics,
  ProxmoxProvisionInput,
  ProxmoxProvisionResult,
  ProxmoxProvider,
} from "../interfaces/proxmox-provider.interface";

interface ProxmoxEnvelope<T> {
  data: T;
}

interface ProxmoxTaskStatus {
  status: string;
  exitstatus?: string;
}

interface ProxmoxVmStatus {
  status?: string;
  cpu?: number;
  mem?: number;
  maxmem?: number;
  diskread?: number;
  diskwrite?: number;
}

interface ProxmoxRrdPoint {
  cpu?: number;
  diskread?: number;
  diskwrite?: number;
}

@Injectable()
export class RealProxmoxProvider implements ProxmoxProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>("proxmox.apiUrl")?.trim() &&
      this.config.get<string>("proxmox.tokenId")?.trim() &&
      this.config.get<string>("proxmox.tokenSecret")?.trim(),
    );
  }

  async provision(input: ProxmoxProvisionInput): Promise<ProxmoxProvisionResult> {
    if (input.type === "DEDICATED") {
      throw new BadRequestException("Dedicated bare-metal provisioning is not handled by Proxmox");
    }
    const node = this.nodeForRegion(input.region);
    const templateVmId = this.templateFor(input.osTemplate);
    const vmId = String(await this.request<number>("cluster/nextid"));

    const cloneTask = await this.post(`nodes/${node}/qemu/${templateVmId}/clone`, {
      newid: vmId,
      name: input.hostname,
      full: "1",
      target: node,
      storage: this.config.get<string>("proxmox.storage", "local-lvm"),
    });
    await this.waitForTask(node, String(cloneTask));

    await this.put(`nodes/${node}/qemu/${vmId}/config`, {
      cores: String(input.cpuCores),
      memory: String(input.ramGb * 1024),
      onboot: "1",
      agent: "enabled=1",
    });
    await this.put(`nodes/${node}/qemu/${vmId}/resize`, {
      disk: this.config.get<string>("proxmox.disk", "scsi0"),
      size: `${input.diskGb}G`,
    });

    const startTask = await this.post(`nodes/${node}/qemu/${vmId}/status/start`, {});
    await this.waitForTask(node, String(startTask));
    const ipv4 = await this.waitForIpv4(node, vmId);

    return { vmId, node, ipv4, status: ServerStatus.RUNNING };
  }

  async powerAction(
    vmId: string,
    node: string,
    action: ServerPowerAction,
    currentStatus: ServerStatus,
  ): Promise<ServerStatus> {
    if (currentStatus === ServerStatus.PROVISIONING)
      throw new Error("Server is still provisioning");
    if (currentStatus === ServerStatus.SUSPENDED) throw new Error("Server is suspended");
    const command = {
      [ServerPowerAction.START]: "start",
      [ServerPowerAction.STOP]: "stop",
      [ServerPowerAction.SHUTDOWN]: "shutdown",
      [ServerPowerAction.REBOOT]: "reboot",
    }[action];
    const task = await this.post(`nodes/${node}/qemu/${vmId}/status/${command}`, {});
    await this.waitForTask(node, String(task));
    return action === ServerPowerAction.STOP || action === ServerPowerAction.SHUTDOWN
      ? ServerStatus.STOPPED
      : ServerStatus.RUNNING;
  }

  async getMetrics(vmId: string, node: string, ramTotalGb: number): Promise<ProxmoxMetrics> {
    const [current, history] = await Promise.all([
      this.request<ProxmoxVmStatus>(`nodes/${node}/qemu/${vmId}/status/current`),
      this.request<ProxmoxRrdPoint[]>(
        `nodes/${node}/qemu/${vmId}/rrddata?timeframe=hour&cf=AVERAGE`,
      ),
    ]);
    const cpuHistory = history.map((point) => Math.round((point.cpu ?? 0) * 1000) / 10).slice(-12);
    const cpuPercent = Math.round((current.cpu ?? 0) * 1000) / 10;
    const effectiveRamTotal = current.maxmem ? current.maxmem / 1024 ** 3 : ramTotalGb;
    const ramUsedGb = (current.mem ?? 0) / 1024 ** 3;
    const latestRrd = history.at(-1);
    const diskIoMbps = ((latestRrd?.diskread ?? 0) + (latestRrd?.diskwrite ?? 0)) / 1024 ** 2;
    return {
      cpuPercent,
      cpuTrend: cpuHistory.length > 1 ? cpuHistory.at(-1)! - cpuHistory[0]! : 0,
      cpuHistory,
      ramUsedGb: Math.round(ramUsedGb * 10) / 10,
      ramTotalGb: Math.round(effectiveRamTotal * 10) / 10,
      ramBufferedGb: 0,
      ramCacheGb: 0,
      diskIoMbps: Math.round(diskIoMbps * 10) / 10,
      diskIops: 0,
    };
  }

  private async waitForTask(node: string, upid: string): Promise<void> {
    const timeoutMs = this.config.get<number>("proxmox.taskTimeoutMs", 600_000);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.request<ProxmoxTaskStatus>(
        `nodes/${node}/tasks/${encodeURIComponent(upid)}/status`,
      );
      if (result.status === "stopped") {
        if (result.exitstatus && result.exitstatus !== "OK") {
          throw new BadGatewayException(`Proxmox task failed: ${result.exitstatus}`);
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    throw new BadGatewayException("Proxmox task timed out");
  }

  private async waitForIpv4(node: string, vmId: string): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const network = await this.request<{
          result?: Array<{
            "ip-addresses"?: Array<{ "ip-address": string; "ip-address-type": string }>;
          }>;
        }>(`nodes/${node}/qemu/${vmId}/agent/network-get-interfaces`);
        const address = network.result
          ?.flatMap((item) => item["ip-addresses"] ?? [])
          .find(
            (item) =>
              item["ip-address-type"] === "ipv4" &&
              item["ip-address"] !== "127.0.0.1" &&
              !item["ip-address"].startsWith("169.254."),
          )?.["ip-address"];
        if (address) return address;
      } catch {
        // Guest agent can take a few seconds to become ready after first boot.
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    return "";
  }

  private post(path: string, body: Record<string, string>) {
    return this.request<string>(path, { method: "POST", body: new URLSearchParams(body) });
  }

  private put(path: string, body: Record<string, string>) {
    return this.request<unknown>(path, { method: "PUT", body: new URLSearchParams(body) });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const apiUrl = this.config.get<string>("proxmox.apiUrl", "").trim().replace(/\/$/, "");
    const tokenId = this.config.get<string>("proxmox.tokenId", "").trim();
    const tokenSecret = this.config.get<string>("proxmox.tokenSecret", "").trim();
    if (!apiUrl || !tokenId || !tokenSecret) {
      throw new BadRequestException("Proxmox API credentials are not configured");
    }
    if (!apiUrl.startsWith("https://")) {
      throw new BadRequestException("Proxmox API URL must use HTTPS");
    }
    let response: Response;
    try {
      response = await fetch(`${apiUrl}/api2/json/${path.replace(/^\//, "")}`, {
        ...init,
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`,
          ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
          ...init?.headers,
        },
      });
    } catch (error) {
      throw new BadGatewayException(
        `Proxmox API is unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const payload = (await response.json().catch(() => null)) as ProxmoxEnvelope<T> | null;
    if (!response.ok || !payload) {
      throw new BadGatewayException(`Proxmox API returned HTTP ${response.status}`);
    }
    return payload.data;
  }

  private nodeForRegion(region: string): string {
    const nodes = this.jsonMap("proxmox.regionNodes");
    return nodes[region] ?? this.config.get<string>("proxmox.defaultNode", "pve");
  }

  private templateFor(osTemplate: string): string {
    const templates = this.jsonMap("proxmox.templates");
    const vmId =
      templates[osTemplate] ?? this.config.get<string>("proxmox.defaultTemplateVmId", "");
    if (!vmId) throw new BadRequestException(`No Proxmox template mapped for ${osTemplate}`);
    return vmId;
  }

  private jsonMap(key: string): Record<string, string> {
    const value = this.config.get<Record<string, string>>(key, {});
    return value && typeof value === "object" ? value : {};
  }
}
