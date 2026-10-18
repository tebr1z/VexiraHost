import { Injectable } from "@nestjs/common";
import type {
  ManagedServerStatus,
  ManagedServerTaskStatus,
  ManagedServerTaskType,
  Prisma,
  SecurityFindingSeverity,
  SecurityFindingStatus,
} from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class ManagedServersRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.managedServer.findMany({
      where: { userId },
      include: {
        findings: { where: { status: "OPEN" }, orderBy: { detectedAt: "desc" } },
        tasks: { orderBy: { createdAt: "desc" }, take: 8 },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listAll() {
    return this.prisma.managedServer.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        findings: { where: { status: "OPEN" }, orderBy: { detectedAt: "desc" } },
        tasks: { orderBy: { createdAt: "desc" }, take: 8 },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
  }

  findForUser(id: string, userId: string) {
    return this.prisma.managedServer.findFirst({
      where: { id, userId },
      include: {
        findings: { orderBy: [{ status: "asc" }, { detectedAt: "desc" }] },
        tasks: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  findById(id: string) {
    return this.prisma.managedServer.findUnique({
      where: { id },
      include: {
        findings: { orderBy: [{ status: "asc" }, { detectedAt: "desc" }] },
        tasks: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  listMonitored() {
    return this.prisma.managedServer.findMany({ where: { monitoringEnabled: true } });
  }

  create(data: {
    userId: string;
    name: string;
    host: string;
    sshPort: number;
    sshUsername: string;
    sshPasswordEnc: string;
    packageCode: string;
    selectedFeatures: string[];
  }) {
    return this.prisma.managedServer.create({ data });
  }

  update(id: string, data: Prisma.ManagedServerUpdateInput) {
    return this.prisma.managedServer.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.managedServer.delete({ where: { id } });
  }

  createTask(data: {
    serverId: string;
    type: ManagedServerTaskType;
    status?: ManagedServerTaskStatus;
    requestedFeatures?: string[];
    requestedById?: string;
    log?: string;
  }) {
    return this.prisma.managedServerTask.create({ data });
  }

  updateTask(id: string, data: Prisma.ManagedServerTaskUpdateInput) {
    return this.prisma.managedServerTask.update({ where: { id }, data });
  }

  findTask(id: string) {
    return this.prisma.managedServerTask.findUnique({ where: { id }, include: { server: true } });
  }

  upsertFinding(data: {
    serverId: string;
    key: string;
    severity: SecurityFindingSeverity;
    status?: SecurityFindingStatus;
    title: string;
    description: string;
    remediation?: string;
    autoFixAvailable?: boolean;
  }) {
    return this.prisma.managedServerFinding.upsert({
      where: { serverId_key: { serverId: data.serverId, key: data.key } },
      create: data,
      update: {
        severity: data.severity,
        status: data.status ?? "OPEN",
        title: data.title,
        description: data.description,
        remediation: data.remediation,
        autoFixAvailable: data.autoFixAvailable ?? false,
        detectedAt: new Date(),
        resolvedAt: null,
      },
    });
  }

  findFindingForServer(id: string, serverId: string) {
    return this.prisma.managedServerFinding.findFirst({ where: { id, serverId } });
  }

  resolveFinding(id: string) {
    return this.prisma.managedServerFinding.update({
      where: { id },
      data: { status: "FIXED", resolvedAt: new Date() },
    });
  }

  resolveMissingFindings(serverId: string, activeKeys: string[]) {
    return this.prisma.managedServerFinding.updateMany({
      where: { serverId, status: "OPEN", key: { notIn: activeKeys } },
      data: { status: "FIXED", resolvedAt: new Date() },
    });
  }

  async hasRunningTask(serverId: string): Promise<boolean> {
    const count = await this.prisma.managedServerTask.count({
      where: { serverId, status: { in: ["QUEUED", "RUNNING"] } },
    });
    return count > 0;
  }

  updateStatus(id: string, status: ManagedServerStatus, lastError?: string | null) {
    return this.prisma.managedServer.update({
      where: { id },
      data: { status, lastError, lastCheckedAt: new Date() },
    });
  }
}
