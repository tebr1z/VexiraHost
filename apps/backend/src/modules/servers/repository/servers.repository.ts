import { Injectable } from "@nestjs/common";
import type { ServerPowerAction, ServerStatus, ServerType } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class ServersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlans(type?: ServerType) {
    return this.prisma.serverPlan.findMany({
      where: { isActive: true, ...(type ? { type } : {}) },
      orderBy: { sortOrder: "asc" },
    });
  }

  findPlanBySlug(slug: string) {
    return this.prisma.serverPlan.findFirst({ where: { slug, isActive: true } });
  }

  findByUserId(userId: string) {
    return this.prisma.server.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.server.findFirst({
      where: { id, userId },
      include: { plan: true },
    });
  }

  findByHostname(hostname: string) {
    return this.prisma.server.findUnique({ where: { hostname: hostname.toLowerCase() } });
  }

  createServer(data: {
    userId: string;
    planId: string;
    hostname: string;
    displayName: string;
    type: ServerType;
    region: string;
    osTemplate: string;
    cpuCores: number;
    ramGb: number;
    diskGb: number;
    proxmoxVmId?: string;
    proxmoxNode?: string;
    ipv4?: string;
    status: ServerStatus;
    provisionedAt?: Date;
  }) {
    return this.prisma.server.create({ data });
  }

  updateServer(id: string, data: { status?: ServerStatus; ipv4?: string; proxmoxVmId?: string; proxmoxNode?: string; provisionedAt?: Date }) {
    return this.prisma.server.update({ where: { id }, data });
  }

  createPowerLog(data: {
    serverId: string;
    action: ServerPowerAction;
    success: boolean;
    message?: string;
  }) {
    return this.prisma.serverPowerLog.create({ data });
  }

  getPowerLogs(serverId: string, limit = 10) {
    return this.prisma.serverPowerLog.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
