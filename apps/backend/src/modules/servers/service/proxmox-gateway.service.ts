import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ServerPowerAction, ServerStatus } from "@prisma/client";

import type { ProxmoxProvisionInput } from "../interfaces/proxmox-provider.interface";
import { MockProxmoxProvider } from "../providers/mock-proxmox.provider";
import { RealProxmoxProvider } from "../providers/proxmox.provider";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class ProxmoxGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mock: MockProxmoxProvider,
    private readonly real: RealProxmoxProvider,
  ) {}

  private async provider() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "proxmox_provider" },
    });
    const selected = (setting?.value ?? this.config.get<string>("proxmox.provider") ?? "mock")
      .trim()
      .toLowerCase();
    return selected === "real" || selected === "proxmox" ? this.real : this.mock;
  }

  async provision(input: ProxmoxProvisionInput) {
    return (await this.provider()).provision(input);
  }

  async powerAction(
    vmId: string,
    node: string,
    action: ServerPowerAction,
    currentStatus: ServerStatus,
  ) {
    return (await this.provider()).powerAction(vmId, node, action, currentStatus);
  }

  async getMetrics(vmId: string, node: string, ramTotalGb: number) {
    return (await this.provider()).getMetrics(vmId, node, ramTotalGb);
  }
}
