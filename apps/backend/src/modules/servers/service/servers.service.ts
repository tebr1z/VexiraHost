import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Server, ServerPlan, ServerStatus, ServerType } from "@prisma/client";

import type { ProvisionServerDto, ServerPowerDto } from "../dto";
import { MockProxmoxProvider } from "../providers/mock-proxmox.provider";
import { ServersRepository } from "../repository/servers.repository";

const REGION_LABELS: Record<string, string> = {
  "fra-01": "Frankfurt (FRA-01)",
  "nyc-01": "New York (NYC-01)",
  "sin-01": "Singapore (SIN-01)",
};

function mapPlan(plan: ServerPlan) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    type: plan.type,
    cpuCores: plan.cpuCores,
    ramGb: plan.ramGb,
    diskGb: plan.diskGb,
    bandwidthGbps: Number(plan.bandwidthGbps),
    price: Number(plan.price),
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    regions: plan.regions,
  };
}

function mapServer(server: Server & { plan: ServerPlan }) {
  return {
    id: server.id,
    hostname: server.hostname,
    displayName: server.displayName,
    type: server.type,
    status: server.status,
    region: server.region,
    regionLabel: REGION_LABELS[server.region] ?? server.region,
    ipv4: server.ipv4,
    osTemplate: server.osTemplate,
    cpuCores: server.cpuCores,
    ramGb: server.ramGb,
    diskGb: server.diskGb,
    proxmoxVmId: server.proxmoxVmId,
    proxmoxNode: server.proxmoxNode,
    provisionedAt: server.provisionedAt,
    createdAt: server.createdAt,
    plan: mapPlan(server.plan),
  };
}

@Injectable()
export class ServersService {
  constructor(
    private readonly serversRepository: ServersRepository,
    private readonly proxmox: MockProxmoxProvider,
  ) {}

  listPlans(type?: ServerType) {
    return this.serversRepository.findActivePlans(type).then((plans) => plans.map(mapPlan));
  }

  listForUser(userId: string) {
    return this.serversRepository.findByUserId(userId).then((servers) => servers.map(mapServer));
  }

  async getForUser(id: string, userId: string) {
    const server = await this.serversRepository.findByIdForUser(id, userId);
    if (!server) throw new NotFoundException("Server not found");
    return mapServer(server);
  }

  async getMetrics(id: string, userId: string) {
    const server = await this.serversRepository.findByIdForUser(id, userId);
    if (!server) throw new NotFoundException("Server not found");
    return this.proxmox.getMetrics(server.id, server.ramGb);
  }

  async provision(userId: string, dto: ProvisionServerDto) {
    const plan = await this.serversRepository.findPlanBySlug(dto.planSlug);
    if (!plan) throw new NotFoundException("Server plan not found");
    if (!plan.regions.includes(dto.region)) {
      throw new BadRequestException("Region is not available for this plan");
    }

    const hostname = dto.hostname.trim().toLowerCase();
    const existing = await this.serversRepository.findByHostname(hostname);
    if (existing) throw new ConflictException("Hostname is already taken");

    const osTemplate = dto.osTemplate ?? "ubuntu-22.04";
    const displayName = dto.displayName?.trim() || hostname;

    let server = await this.serversRepository.createServer({
      userId,
      planId: plan.id,
      hostname,
      displayName,
      type: plan.type,
      region: dto.region,
      osTemplate,
      cpuCores: plan.cpuCores,
      ramGb: plan.ramGb,
      diskGb: plan.diskGb,
      status: "PROVISIONING" as ServerStatus,
    });

    try {
      const result = await this.proxmox.provision({
        hostname,
        cpuCores: plan.cpuCores,
        ramGb: plan.ramGb,
        diskGb: plan.diskGb,
        region: dto.region,
        osTemplate,
      });

      server = await this.serversRepository.updateServer(server.id, {
        status: result.status,
        ipv4: result.ipv4,
        proxmoxVmId: result.vmId,
        proxmoxNode: result.node,
        provisionedAt: new Date(),
      });

      const full = await this.serversRepository.findByIdForUser(server.id, userId);
      return mapServer(full!);
    } catch (error) {
      await this.serversRepository.updateServer(server.id, { status: "ERROR" });
      throw error;
    }
  }

  async powerAction(id: string, userId: string, dto: ServerPowerDto) {
    const server = await this.serversRepository.findByIdForUser(id, userId);
    if (!server) throw new NotFoundException("Server not found");
    if (!server.proxmoxVmId || !server.proxmoxNode) {
      throw new BadRequestException("Server is not fully provisioned");
    }

    try {
      const newStatus = await this.proxmox.powerAction(
        server.proxmoxVmId,
        server.proxmoxNode,
        dto.action,
        server.status,
      );

      await this.serversRepository.updateServer(server.id, { status: newStatus });
      await this.serversRepository.createPowerLog({
        serverId: server.id,
        action: dto.action,
        success: true,
      });

      const updated = await this.serversRepository.findByIdForUser(id, userId);
      return {
        server: mapServer(updated!),
        action: dto.action,
      };
    } catch (error) {
      await this.serversRepository.createPowerLog({
        serverId: server.id,
        action: dto.action,
        success: false,
        message: error instanceof Error ? error.message : "Power action failed",
      });
      throw new BadRequestException(
        error instanceof Error ? error.message : "Power action failed",
      );
    }
  }

  async getPowerLogs(id: string, userId: string) {
    const server = await this.serversRepository.findByIdForUser(id, userId);
    if (!server) throw new NotFoundException("Server not found");
    const logs = await this.serversRepository.getPowerLogs(id);
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      success: log.success,
      message: log.message,
      createdAt: log.createdAt,
    }));
  }
}
