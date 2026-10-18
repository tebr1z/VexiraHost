import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DeployDomainMode,
  DeployRuntime,
  DeploySource,
  DeployStack,
  ServiceStatus,
} from "@prisma/client";

import { CreateDeploymentDto, CreateUploadDeploymentDto } from "../dto/create-deployment.dto";
import { UpdateDeploymentEnvDto } from "../dto/update-deployment-env.dto";
import { DeployRepository } from "../repository/deploy.repository";
import { stripCustomerPort } from "../utils/deploy-env.util";
import { sanitizeDockerImageRef } from "../utils/docker-image.util";
import { defaultContainerPort } from "../utils/docker-templates.util";

import { DeployHealthService } from "./deploy-health.service";
import { DeployRunner } from "./deploy.runner";
import { GitHubDeployService } from "./github-deploy.service";
import { PleskSiteService } from "./plesk-site.service";
import { PortAllocationService } from "./port-allocation.service";
import { RemoteDeployService } from "./remote-deploy.service";

import { HostingRepository } from "@/modules/hosting/repository/hosting.repository";
import { decryptSecret, encryptSecret } from "@/utils/crypto.util";

function parseEnvVars(enc: string | null | undefined): Record<string, string> {
  if (!enc) return {};
  try {
    return JSON.parse(decryptSecret(enc)) as Record<string, string>;
  } catch {
    return {};
  }
}

function serializeDeployment(deployment: Awaited<ReturnType<DeployRepository["findByIdForUser"]>>) {
  if (!deployment) return null;
  return {
    id: deployment.id,
    hostingAccountId: deployment.hostingAccountId,
    name: deployment.name,
    stack: deployment.stack,
    source: deployment.source,
    runtime: deployment.runtime,
    domainMode: deployment.domainMode,
    subdomain: deployment.subdomain,
    deployDomain: deployment.deployDomain,
    repoUrl: deployment.repoUrl,
    imageRef: deployment.imageRef,
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
    envVars: parseEnvVars(deployment.envVarsEnc),
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
    private readonly githubDeploy: GitHubDeployService,
    private readonly remoteDeploy: RemoteDeployService,
    private readonly deployHealth: DeployHealthService,
  ) {}

  async list(accountId: string, userId: string) {
    const account = await this.assertAccount(accountId, userId);
    this.assertDeployEligible(account);
    const rows = await this.deployRepository.listForAccount(accountId, userId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      stack: row.stack,
      source: row.source,
      runtime: row.runtime,
      domainMode: row.domainMode,
      subdomain: row.subdomain,
      deployDomain: row.deployDomain,
      repoUrl: row.repoUrl,
      imageRef: row.imageRef,
      branch: row.branch,
      status: row.status,
      stage: row.stage,
      lastError: row.lastError,
      lastDeployedAt: row.lastDeployedAt,
      createdAt: row.createdAt,
      latestRun: row.runs[0] ?? null,
    }));
  }

  async resources(accountId: string, userId: string) {
    const account = await this.assertAccount(accountId, userId);
    this.assertDeployEligible(account);
    return this.collectResources(account);
  }

  async adminResources(accountId: string) {
    const account = await this.hostingRepository.findById(accountId);
    if (!account) throw new NotFoundException("Hosting account not found");
    return this.collectResources(account);
  }

  private async collectResources(
    account: NonNullable<Awaited<ReturnType<HostingRepository["findById"]>>>,
  ) {
    const accountId = account.id;
    const apps = await this.deployRepository.listByAccount(accountId);
    const runtimeIds = new Set(apps.map((app) => app.deployServerId).filter(Boolean));
    if (runtimeIds.size > 1)
      throw new BadRequestException(
        "Applications span multiple runtime servers; consolidate them before aggregate resource monitoring",
      );
    const server =
      apps.find((app) => app.deployServer)?.deployServer ??
      account.plan.autoDeployServer ??
      account.server;
    if (apps.length && !server?.deployNodeEnabled)
      throw new BadRequestException("Auto Deploy runtime is not configured");
    const usage =
      apps.length && server
        ? await this.remoteDeploy.probeResources(server, accountId)
        : {
            ready: false,
            mock: false,
            checkedAt: new Date().toISOString(),
            memoryBytes: null,
            diskBytes: null,
            cpuPercent: null,
            appliedCpuPercent: null,
            appliedMemoryMb: null,
            appliedDiskGb: null,
          };
    return {
      accountId,
      hasDeployments: apps.length > 0,
      ...usage,
      limits: {
        cpuPercent: account.plan.autoDeployCpuPercent,
        memoryMb: account.plan.autoDeployMemoryMb,
        diskGb: account.autoDeployDiskGbOverride ?? account.plan.autoDeployDiskGb,
        maxApps: account.autoDeployMaxAppsOverride ?? account.plan.autoDeployMaxApps,
      },
    };
  }

  async get(accountId: string, deploymentId: string, userId: string) {
    await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    return serializeDeployment(deployment);
  }

  async create(
    accountId: string,
    userId: string,
    dto: CreateDeploymentDto,
    sourceArchivePath?: string,
  ) {
    const account = await this.assertAccount(accountId, userId);
    this.assertDeployEligible(account);

    const maxApps = account.autoDeployMaxAppsOverride ?? account.plan.autoDeployMaxApps;
    const appCount = await this.deployRepository.countForAccount(accountId);
    if (appCount >= maxApps) {
      throw new BadRequestException(
        `Auto Deploy application limit reached (${appCount}/${maxApps}). Delete an existing app or upgrade the plan.`,
      );
    }

    const deployServer = account.plan.autoDeployServer ?? account.server;
    if (!deployServer?.isActive || !deployServer.deployNodeEnabled) {
      throw new BadRequestException("Auto Deploy server is not active or not configured");
    }
    if (deployServer.deployHealth === "DOWN") {
      throw new BadRequestException("Auto Deploy server is currently unavailable");
    }
    const existingApps = await this.deployRepository.listByAccount(accountId);
    if (existingApps.some((app) => app.deployServerId && app.deployServerId !== deployServer.id)) {
      throw new BadRequestException(
        "This account has apps on a different runtime server. Migrate those apps before creating more so its resource budget stays on one node.",
      );
    }

    if (dto.domainMode === DeployDomainMode.SUBDOMAIN && !dto.subdomain?.trim()) {
      throw new BadRequestException("Subdomain label is required for subdomain deployments");
    }

    const deployDomain = this.pleskSite.resolveDeployDomain(account, dto.domainMode, dto.subdomain);

    const source =
      dto.source === DeploySource.DOCKER_IMAGE
        ? DeploySource.DOCKER_IMAGE
        : dto.source === DeploySource.UPLOAD
          ? DeploySource.UPLOAD
          : DeploySource.GIT;
    const imageRef =
      source === DeploySource.DOCKER_IMAGE ? sanitizeDockerImageRef(dto.imageRef) : null;
    const repoUrl = source === DeploySource.GIT ? this.resolveRepoUrl(dto) : "";
    if (source === DeploySource.GIT && !repoUrl) {
      throw new BadRequestException("Repository URL or GitHub repository is required");
    }
    if (
      source === DeploySource.GIT &&
      dto.stack !== DeployStack.NEXTJS &&
      dto.stack !== DeployStack.NESTJS
    ) {
      throw new BadRequestException("Choose Next.js or NestJS for Git deployments");
    }
    if (
      source === DeploySource.UPLOAD &&
      dto.stack !== DeployStack.NEXTJS &&
      dto.stack !== DeployStack.NESTJS
    ) {
      throw new BadRequestException("Choose Next.js or NestJS for file uploads");
    }
    if (source === DeploySource.UPLOAD && !sourceArchivePath) {
      throw new BadRequestException("ZIP source archive is required");
    }
    if (source === DeploySource.DOCKER_IMAGE && !imageRef) {
      throw new BadRequestException("Docker image is required");
    }
    if (source === DeploySource.DOCKER_IMAGE && dto.stack !== DeployStack.DOTNET) {
      throw new BadRequestException("Docker image deploy is available only for .NET applications");
    }

    const hostPort = (await this.portAllocation.resolveHostPort(deployServer, {})).port;
    const { env: safeEnvVars, ignoredPort } = stripCustomerPort(dto.envVars);
    const envVarsEnc =
      Object.keys(safeEnvVars).length > 0 ? encryptSecret(JSON.stringify(safeEnvVars)) : null;

    const deployment = await this.deployRepository.create({
      hostingAccountId: accountId,
      userId,
      deployServerId: deployServer.id,
      name: dto.name.trim().toLowerCase(),
      stack: dto.stack,
      domainMode: dto.domainMode,
      subdomain: dto.subdomain?.trim().toLowerCase() ?? null,
      deployDomain,
      source,
      runtime: source === DeploySource.DOCKER_IMAGE ? DeployRuntime.DOCKER : DeployRuntime.PM2,
      repoUrl: repoUrl ?? "",
      imageRef,
      sourceArchivePath: source === DeploySource.UPLOAD ? sourceArchivePath : null,
      branch: dto.branch?.trim() || "main",
      rootDirectory: dto.rootDirectory?.trim() || null,
      containerPort: dto.containerPort ?? defaultContainerPort(dto.stack),
      hostPort,
      envVarsEnc,
    });

    const { queuePosition } = await this.deployRunner.enqueue(deployment.id);

    const portNote =
      ignoredPort != null
        ? ` Customer PORT=${ignoredPort} was ignored; the managed runtime uses its assigned port.`
        : source === DeploySource.DOCKER_IMAGE
          ? ` Container uses managed PORT=${deployment.containerPort}.`
          : ` PM2 uses managed PORT=${deployment.hostPort}.`;

    return {
      id: deployment.id,
      deployDomain: deployment.deployDomain,
      status: "RUNNING",
      stage: queuePosition > 1 ? "waiting_server" : "queued",
      queuePosition,
      containerPort: deployment.containerPort,
      hostPort: deployment.hostPort,
      ignoredPort,
      message:
        (queuePosition > 1
          ? "Server is busy — your deploy is queued and will start when the current job finishes."
          : "Deployment queued.") + portNote,
    };
  }

  async createFromUpload(
    accountId: string,
    userId: string,
    dto: CreateUploadDeploymentDto,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("ZIP source archive is required");

    try {
      const account = await this.assertAccount(accountId, userId);
      this.assertDeployEligible(account);
      const autoDeployDiskGb = account.autoDeployDiskGbOverride ?? account.plan.autoDeployDiskGb;
      const diskLimitBytes = autoDeployDiskGb * 1024 * 1024 * 1024;
      if (file.size > diskLimitBytes) {
        throw new BadRequestException(
          `Upload exceeds the ${autoDeployDiskGb} GB Auto Deploy disk limit`,
        );
      }

      let envVars: Record<string, string> = {};
      if (dto.envVarsJson?.trim()) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(dto.envVarsJson);
        } catch {
          throw new BadRequestException("Environment variables JSON is invalid");
        }
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          throw new BadRequestException("Environment variables must be an object");
        }
        envVars = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value),
          ]),
        );
      }

      return await this.create(
        accountId,
        userId,
        {
          name: dto.name,
          stack: dto.stack,
          source: DeploySource.UPLOAD,
          domainMode: dto.domainMode,
          subdomain: dto.subdomain,
          rootDirectory: dto.rootDirectory,
          containerPort: dto.containerPort,
          envVars,
        },
        file.path,
      );
    } catch (error) {
      await this.removeSourceArchive(file.path);
      throw error;
    }
  }

  async redeploy(accountId: string, deploymentId: string, userId: string) {
    await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    if (deployment.status === "RUNNING") {
      const inFlight = this.deployRunner.abort(deploymentId, { requeue: true });
      await this.deployRepository.update(deploymentId, {
        status: "PENDING",
        stage: null,
        lastError: null,
      });
      if (inFlight) {
        return {
          id: deploymentId,
          queuePosition: this.deployRunner.getQueuePosition(deploymentId) ?? 1,
          message: "Stuck deploy cancelled — retry will start as soon as the server is free",
        };
      }
    }

    await this.deployRepository.update(deploymentId, {
      status: "PENDING",
      stage: null,
      lastError: null,
    });
    const { queuePosition } = await this.deployRunner.enqueue(deploymentId);

    return {
      id: deploymentId,
      queuePosition,
      message:
        queuePosition > 1
          ? "Server is busy — redeploy queued and will start when the current job finishes"
          : "Redeploy queued",
    };
  }

  async remove(accountId: string, deploymentId: string, userId: string) {
    const account = await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    this.deployRunner.abort(deploymentId);

    const runtimeServer =
      deployment.deployServer ?? account.plan.autoDeployServer ?? account.server;
    const pleskServer = account.server ?? deployment.hostingAccount.server;
    if (runtimeServer) {
      try {
        await this.remoteDeploy.removeDeployment({
          server: runtimeServer,
          accountId,
          proxyServer: pleskServer ?? undefined,
          deployPath: deployment.deployPath,
          containerName: deployment.containerName,
          deployDomain: deployment.deployDomain,
        });
      } catch {
        // Container/files may still be locked by a cancelled build — record is removed anyway.
      }

      // Only remove Plesk addon domains we created — never the primary subscription domain.
      if (deployment.domainMode === DeployDomainMode.SUBDOMAIN && pleskServer) {
        try {
          await this.pleskSite.removeSite(pleskServer, {
            id: deployment.pleskSiteId,
            name: deployment.deployDomain,
          });
        } catch {
          /* best-effort */
        }
      }
    }

    await this.deployRepository.delete(deploymentId);
    if (deployment.sourceArchivePath) {
      await this.removeSourceArchive(deployment.sourceArchivePath);
    }
    return { id: deploymentId, message: "Deployment deleted" };
  }

  /** Tear down every auto-deploy app (API/site) for a hosting account. */
  async removeAllForAccount(accountId: string): Promise<void> {
    const rows = await this.deployRepository.listByAccount(accountId);
    for (const deployment of rows) {
      this.deployRunner.abort(deployment.id);
      const runtimeServer =
        deployment.deployServer ??
        deployment.hostingAccount.plan.autoDeployServer ??
        deployment.hostingAccount.server;
      const pleskServer = deployment.hostingAccount.server;
      if (runtimeServer) {
        try {
          await this.remoteDeploy.removeDeployment({
            server: runtimeServer,
            accountId,
            proxyServer: pleskServer ?? undefined,
            deployPath: deployment.deployPath,
            containerName: deployment.containerName,
            deployDomain: deployment.deployDomain,
          });
        } catch {
          /* best-effort */
        }
        if (deployment.domainMode === DeployDomainMode.SUBDOMAIN && pleskServer) {
          try {
            await this.pleskSite.removeSite(pleskServer, {
              id: deployment.pleskSiteId,
              name: deployment.deployDomain,
            });
          } catch {
            /* best-effort */
          }
        }
      }
      try {
        await this.deployRepository.delete(deployment.id);
      } catch {
        /* already gone */
      }
      if (deployment.sourceArchivePath) {
        await this.removeSourceArchive(deployment.sourceArchivePath);
      }
    }
  }

  async updateEnv(
    accountId: string,
    deploymentId: string,
    userId: string,
    dto: UpdateDeploymentEnvDto,
  ) {
    const account = await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    if (deployment.status === "RUNNING") {
      throw new BadRequestException("Wait for the current deploy to finish before changing env");
    }

    const { env: envVars, ignoredPort } = stripCustomerPort(dto.envVars);
    const envVarsEnc =
      Object.keys(envVars).length > 0 ? encryptSecret(JSON.stringify(envVars)) : null;

    await this.deployRepository.update(deploymentId, { envVarsEnc });

    const portNote =
      ignoredPort != null
        ? ` Customer PORT=${ignoredPort} was ignored; the managed runtime keeps its assigned port.`
        : "";

    if (dto.redeploy) {
      await this.deployRepository.update(deploymentId, {
        status: "PENDING",
        stage: null,
        lastError: null,
      });
      const { queuePosition } = await this.deployRunner.enqueue(deploymentId);
      return {
        id: deploymentId,
        queuePosition,
        containerPort: deployment.containerPort,
        ignoredPort,
        message:
          (queuePosition > 1
            ? "Environment saved — redeploy queued (server busy, will start next)."
            : "Environment saved — full redeploy queued.") + portNote,
      };
    }

    const server = deployment.deployServer ?? account.plan.autoDeployServer ?? account.server;
    if (
      deployment.status === "SUCCESS" &&
      deployment.containerName &&
      deployment.deployPath &&
      server
    ) {
      await this.remoteDeploy.restartApplication({
        server,
        accountId,
        deployPath: deployment.deployPath,
        containerName: deployment.containerName,
        runtime: deployment.runtime,
        hostPort: deployment.hostPort,
        containerPort: deployment.containerPort,
        envVars,
        resourceLimits: {
          cpuPercent: account.plan.autoDeployCpuPercent,
          memoryMb: account.plan.autoDeployMemoryMb,
          diskGb: account.autoDeployDiskGbOverride ?? account.plan.autoDeployDiskGb,
        },
        bindHost: server.id === account.server?.id ? "127.0.0.1" : "0.0.0.0",
      });
      return {
        id: deploymentId,
        containerPort: deployment.containerPort,
        ignoredPort,
        message: `Environment saved and application restarted.${portNote}`,
      };
    }

    return {
      id: deploymentId,
      containerPort: deployment.containerPort,
      ignoredPort,
      message: `Environment saved — redeploy to apply.${portNote}`,
    };
  }

  async checkHealth(accountId: string, deploymentId: string, userId: string) {
    const account = await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }
    if (deployment.status !== "SUCCESS") {
      throw new BadRequestException("Health check is available only for successful deployments");
    }

    const server = deployment.deployServer ?? account.plan.autoDeployServer ?? account.server;
    if (!server) {
      throw new BadRequestException("Hosting server is not assigned");
    }

    return this.deployHealth.check(deployment, server);
  }

  async getContainerLogs(accountId: string, deploymentId: string, userId: string, lines?: number) {
    const account = await this.assertAccount(accountId, userId);
    const deployment = await this.deployRepository.findByIdForUser(deploymentId, userId);
    if (!deployment || deployment.hostingAccountId !== accountId) {
      throw new NotFoundException("Deployment not found");
    }

    const server = deployment.deployServer ?? account.plan.autoDeployServer ?? account.server;
    if (!server) {
      throw new BadRequestException("Hosting server is not assigned");
    }

    return this.deployHealth.getContainerLogs(deployment, server, lines ?? 100);
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
      throw new BadRequestException("Deploy is not available on this hosting plan");
    }
    if (account.panel !== "PLESK") {
      throw new BadRequestException("Deploy is not available for this hosting type");
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

  private resolveRepoUrl(dto: CreateDeploymentDto): string | null {
    const manual = dto.repoUrl?.trim();
    if (manual) return manual;
    const fullName = dto.githubRepoFullName?.trim();
    if (fullName) {
      return this.githubDeploy.resolveRepoUrlFromSelection(fullName);
    }
    return null;
  }

  private async removeSourceArchive(archivePath: string): Promise<void> {
    const uploadRoot = resolve(process.cwd(), "storage", "deploy-uploads");
    const resolvedPath = resolve(archivePath);
    if (!resolvedPath.startsWith(`${uploadRoot}${sep}`)) return;
    try {
      await unlink(resolvedPath);
    } catch {
      /* already removed */
    }
  }
}
