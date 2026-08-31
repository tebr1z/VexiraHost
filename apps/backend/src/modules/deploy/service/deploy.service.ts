import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DeployDomainMode, ServiceStatus } from "@prisma/client";

import { CreateDeploymentDto } from "../dto/create-deployment.dto";
import { DeployRepository } from "../repository/deploy.repository";
import { defaultContainerPort } from "../utils/docker-templates.util";

import { DeployRunner } from "./deploy.runner";
import { PleskSiteService } from "./plesk-site.service";
import { PortAllocationService } from "./port-allocation.service";

import { HostingRepository } from "@/modules/hosting/repository/hosting.repository";
import { encryptSecret } from "@/utils/crypto.util";

function serializeDeployment(deployment: Awaited<ReturnType<DeployRepository["findByIdForUser"]>>) {
  if (!deployment) return null;
  return {
    id: deployment.id,
    hostingAccountId: deployment.hostingAccountId,
    name: deployment.name,
    stack: deployment.stack,
    domainMode: deployment.domainMode,
    subdomain: deployment.subdomain,
    deployDomain: deployment.deployDomain,
    repoUrl: deployment.repoUrl,
    branch: deployment.branch,
    rootDirectory: deployment.rootDirectory,
    containerPort: deployment.containerPort,
    hostPort: deployment.hostPort,
    status: deployment.status,
    stage: deployment.stage,
    lastError: deployment.lastError,
    pleskSiteId: deployment.pleskSiteId,
    containerName: deployment.containerName,
    deployPath: deployment.deployPath,
    lastDeployedAt: deployment.lastDeployedAt,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    runs: deployment.runs?.map((run) => ({
      id: run.id,
      status: run.status,
      stage: run.stage,
      log: run.log,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    })),
  };
}

@Injectable()
export class DeployService {
  constructor(
    private readonly deployRepository: DeployRepository,
    private readonly hostingRepository: HostingRepository,
    private readonly pleskSite: PleskSiteService,
    private readonly portAllocation: PortAllocationService,
    private readonly deployRunner: DeployRunner,
  ) {}

  async list(accountId: string, userId: string) {
    const account = await this.assertAccount(accountId, userId);
    this.assertDeployEligible(account);
    const rows = await this.deployRepository.listForAccount(accountId, userId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      stack: row.stack,
      domainMode: row.domainMode,
      subdomain: row.subdomain,
      deployDomain: row.deployDomain,
      repoUrl: row.repoUrl,
      branch: row.branch,
      status: row.status,
      stage: row.stage,
      lastError: row.lastError,
      lastDeployedAt: row.lastDeployedAt,
      createdAt: row.createdAt,
      latestRun: row.runs[0] ?? null,
    }));
  }

  async get(accountId: string, deploymentId: string, userId: string) {
    await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    return serializeDeployment(deployment);
  }

  async create(accountId: string, userId: string, dto: CreateDeploymentDto) {
    const account = await this.assertAccount(accountId, userId);
    this.assertDeployEligible(account);

    if (dto.domainMode === DeployDomainMode.SUBDOMAIN && !dto.subdomain?.trim()) {
      throw new BadRequestException("Subdomain label is required for subdomain deployments");
    }

    const deployDomain = this.pleskSite.resolveDeployDomain(account, dto.domainMode, dto.subdomain);

    const hostPort = await this.portAllocation.allocate(account.serverId!);
    const envVarsEnc =
      dto.envVars && Object.keys(dto.envVars).length > 0
        ? encryptSecret(JSON.stringify(dto.envVars))
        : null;

    const deployment = await this.deployRepository.create({
      hostingAccountId: accountId,
      userId,
      name: dto.name.trim().toLowerCase(),
      stack: dto.stack,
      domainMode: dto.domainMode,
      subdomain: dto.subdomain?.trim().toLowerCase() ?? null,
      deployDomain,
      repoUrl: dto.repoUrl.trim(),
      branch: dto.branch?.trim() || "main",
      rootDirectory: dto.rootDirectory?.trim() || null,
      containerPort: defaultContainerPort(dto.stack),
      hostPort,
      envVarsEnc,
    });

    this.deployRunner.enqueue(deployment.id);

    return {
      id: deployment.id,
      deployDomain: deployment.deployDomain,
      status: deployment.status,
      stage: deployment.stage,
      message: "Deployment queued",
    };
  }

  async redeploy(accountId: string, deploymentId: string, userId: string) {
    await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    if (deployment.status === "RUNNING") {
      throw new BadRequestException("Deployment is already running");
    }

    await this.deployRepository.update(deploymentId, {
      status: "PENDING",
      stage: null,
      lastError: null,
    });
    this.deployRunner.enqueue(deploymentId);

    return { id: deploymentId, message: "Redeploy queued" };
  }

  private async assertAccount(accountId: string, userId: string) {
    const account = await this.hostingRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new ForbiddenException("Hosting account not found");
    }
    if (account.status !== ServiceStatus.ACTIVE) {
      throw new BadRequestException("Hosting account must be active to manage deployments");
    }
    return account;
  }

  private assertDeployEligible(
    account: NonNullable<Awaited<ReturnType<HostingRepository["findById"]>>>,
  ) {
    if (!account.plan.autoDeployEnabled) {
      throw new BadRequestException("Auto-deploy is not included in your hosting plan");
    }
    if (account.panel !== "PLESK") {
      throw new BadRequestException("Auto-deploy is available for Plesk hosting only");
    }
    if (!account.serverId || !account.server) {
      throw new BadRequestException("Hosting server is not assigned");
    }

    const allowedServerIds = new Set(
      account.plan.planServers.length > 0
        ? account.plan.planServers.map((link) => link.serverId)
        : account.plan.serverId
          ? [account.plan.serverId]
          : [],
    );

    if (allowedServerIds.size > 0 && !allowedServerIds.has(account.serverId)) {
      throw new BadRequestException(
        "This hosting account is not on a Plesk server linked to its plan",
      );
    }
  }
}
