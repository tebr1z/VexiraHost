import { Injectable } from "@nestjs/common";
import type { DeployDomainMode, DeployStack, DeployStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class DeployRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.appDeployment.findUnique({
      where: { id },
      include: {
        hostingAccount: { include: { server: true } },
        runs: { orderBy: { startedAt: "desc" }, take: 5 },
      },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.appDeployment.findFirst({
      where: { id, userId },
      include: {
        hostingAccount: { include: { server: true } },
        runs: { orderBy: { startedAt: "desc" }, take: 5 },
      },
    });
  }

  listForAccount(hostingAccountId: string, userId: string) {
    return this.prisma.appDeployment.findMany({
      where: { hostingAccountId, userId },
      orderBy: { createdAt: "desc" },
      include: {
        runs: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });
  }

  create(data: {
    hostingAccountId: string;
    userId: string;
    name: string;
    stack: DeployStack;
    domainMode: DeployDomainMode;
    subdomain?: string | null;
    deployDomain: string;
    repoUrl: string;
    branch: string;
    rootDirectory?: string | null;
    containerPort: number;
    hostPort: number;
    envVarsEnc?: string | null;
  }) {
    return this.prisma.appDeployment.create({ data });
  }

  update(id: string, data: Prisma.AppDeploymentUpdateInput) {
    return this.prisma.appDeployment.update({ where: { id }, data });
  }

  createRun(deploymentId: string) {
    return this.prisma.deploymentRun.create({
      data: { deploymentId, status: "RUNNING" },
    });
  }

  async appendRunLog(runId: string, chunk: string) {
    const current = await this.prisma.deploymentRun.findUnique({
      where: { id: runId },
      select: { log: true },
    });
    return this.prisma.deploymentRun.update({
      where: { id: runId },
      data: { log: `${current?.log ?? ""}${chunk}` },
    });
  }

  updateRunStage(runId: string, stage: string) {
    return this.prisma.deploymentRun.update({
      where: { id: runId },
      data: { stage },
    });
  }

  finishRun(runId: string, status: DeployStatus, stage?: string | null) {
    return this.prisma.deploymentRun.update({
      where: { id: runId },
      data: {
        status,
        stage: stage ?? undefined,
        finishedAt: new Date(),
      },
    });
  }

  listUsedPortsOnServer(serverId: string): Promise<number[]> {
    return this.prisma.appDeployment
      .findMany({
        where: { hostingAccount: { serverId } },
        select: { hostPort: true },
      })
      .then((rows: Array<{ hostPort: number }>) => rows.map((row) => row.hostPort));
  }
}
