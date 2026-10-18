import { Injectable, Logger } from "@nestjs/common";
import { ServiceStatus } from "@prisma/client";

import { DeployRepository } from "../repository/deploy.repository";
import { DEPLOY_STAGES } from "../types/deploy-stage";
import { redactSshTargets } from "../utils/deploy-env.util";
import { resolveDeployRuntime } from "../utils/deploy-runtime.util";

import { GitHubDeployService } from "./github-deploy.service";
import { PleskSiteService } from "./plesk-site.service";
import { PortAllocationService } from "./port-allocation.service";
import { RemoteDeployService } from "./remote-deploy.service";
import { ServerBootstrapService } from "./server-bootstrap.service";

import { StaffAlertService } from "@/shared/staff-alerts/staff-alert.service";
import { decryptSecret } from "@/utils/crypto.util";

@Injectable()
export class DeployRunner {
  private readonly logger = new Logger(DeployRunner.name);
  /** Deployments currently registered in a server queue (waiting or running). */
  private readonly registered = new Set<string>();
  /** Per-server FIFO of deployment ids (active job is index 0). */
  private readonly queuesByServer = new Map<string, string[]>();
  /** Promise chain so only one deploy runs per hosting server at a time. */
  private readonly tailsByServer = new Map<string, Promise<void>>();

  private readonly aborted = new Set<string>();
  private readonly requeueAfterAbort = new Set<string>();
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(
    private readonly deployRepository: DeployRepository,
    private readonly portAllocation: PortAllocationService,
    private readonly pleskSite: PleskSiteService,
    private readonly remoteDeploy: RemoteDeployService,
    private readonly serverBootstrap: ServerBootstrapService,
    private readonly githubDeploy: GitHubDeployService,
    private readonly staffAlerts: StaffAlertService,
  ) {}

  /**
   * Queue a deploy behind any in-flight job on the same hosting server.
   * Returns 1-based position (1 = starts immediately / is active).
   */
  async enqueue(deploymentId: string): Promise<{ queuePosition: number }> {
    if (this.registered.has(deploymentId)) {
      return { queuePosition: this.getQueuePosition(deploymentId) ?? 1 };
    }

    const deployment = await this.deployRepository.findById(deploymentId);
    if (!deployment) {
      return { queuePosition: 1 };
    }

    const serverId =
      deployment.deployServerId ??
      deployment.hostingAccount.plan.autoDeployServerId ??
      deployment.hostingAccount.serverId;
    if (!serverId) {
      await this.deployRepository.update(deploymentId, {
        status: "FAILED",
        stage: DEPLOY_STAGES.FAILED,
        lastError: "Hosting server is not assigned",
      });
      return { queuePosition: 1 };
    }

    this.registered.add(deploymentId);
    const queue = this.queuesByServer.get(serverId) ?? [];
    queue.push(deploymentId);
    this.queuesByServer.set(serverId, queue);
    const queuePosition = queue.length;

    if (queuePosition > 1) {
      await this.deployRepository.update(deploymentId, {
        status: "RUNNING",
        stage: DEPLOY_STAGES.WAITING_SERVER,
        lastError: null,
      });
      this.logger.log(
        `Deploy ${deploymentId} waiting on server ${serverId} (position ${queuePosition})`,
      );
    }

    const previous = this.tailsByServer.get(serverId) ?? Promise.resolve();
    const job = previous
      .catch(() => undefined)
      .then(async () => {
        await this.run(deploymentId, serverId);
      })
      .catch((error) => {
        this.logger.error(
          `Unhandled deploy error for ${deploymentId}: ${
            error instanceof Error ? error.message : "unknown"
          }`,
        );
      })
      .finally(() => {
        this.dequeue(serverId, deploymentId);
        this.registered.delete(deploymentId);
        this.abortControllers.delete(deploymentId);
        const shouldRequeue = this.requeueAfterAbort.has(deploymentId);
        this.requeueAfterAbort.delete(deploymentId);
        this.aborted.delete(deploymentId);
        if (shouldRequeue) {
          void this.enqueue(deploymentId);
        }
      });

    this.tailsByServer.set(
      serverId,
      job.then(
        () => undefined,
        () => undefined,
      ),
    );

    return { queuePosition };
  }

  getQueuePosition(deploymentId: string): number | null {
    for (const queue of this.queuesByServer.values()) {
      const index = queue.indexOf(deploymentId);
      if (index >= 0) return index + 1;
    }
    return null;
  }

  /**
   * Stop a stuck/in-flight deploy. Pass requeue to retry after the current SSH job dies.
   */
  abort(deploymentId: string, options?: { requeue?: boolean }): boolean {
    if (options?.requeue) this.requeueAfterAbort.add(deploymentId);
    this.aborted.add(deploymentId);
    this.abortControllers.get(deploymentId)?.abort();
    return this.registered.has(deploymentId);
  }

  isRegistered(deploymentId: string): boolean {
    return this.registered.has(deploymentId);
  }

  private dequeue(serverId: string, deploymentId: string): void {
    const queue = this.queuesByServer.get(serverId);
    if (!queue) return;
    const index = queue.indexOf(deploymentId);
    if (index >= 0) queue.splice(index, 1);
    if (queue.length === 0) {
      this.queuesByServer.delete(serverId);
      this.tailsByServer.delete(serverId);
    }
  }

  private async setStage(deploymentId: string, runId: string, stage: string) {
    if (this.aborted.has(deploymentId)) {
      throw new Error("Deploy cancelled");
    }
    await this.deployRepository.update(deploymentId, { stage, status: "RUNNING" });
    await this.deployRepository.updateRunStage(runId, stage);
  }

  private async run(deploymentId: string, expectedServerId: string): Promise<void> {
    if (this.aborted.has(deploymentId)) {
      return;
    }

    const deployment = await this.deployRepository.findById(deploymentId);
    if (!deployment) {
      this.logger.log(`Deploy ${deploymentId} was cancelled before start — skipping`);
      return;
    }

    const account = deployment.hostingAccount;
    const pleskServer = account.server;
    const server = deployment.deployServer ?? account.plan.autoDeployServer ?? pleskServer;
    if (!server || server.id !== expectedServerId || !pleskServer) {
      await this.deployRepository.update(deploymentId, {
        status: "FAILED",
        stage: DEPLOY_STAGES.FAILED,
        lastError: "Plesk or Auto Deploy server is not assigned",
      });
      return;
    }

    if (account.status !== ServiceStatus.ACTIVE) {
      await this.deployRepository.update(deploymentId, {
        status: "FAILED",
        stage: DEPLOY_STAGES.FAILED,
        lastError: "Hosting account must be active before deploying",
      });
      return;
    }

    const abortController = new AbortController();
    this.abortControllers.set(deploymentId, abortController);

    const wasWaiting = deployment.stage === DEPLOY_STAGES.WAITING_SERVER;
    const run = await this.deployRepository.createRun(deploymentId);
    await this.deployRepository.update(deploymentId, {
      status: "RUNNING",
      stage: DEPLOY_STAGES.QUEUED,
      lastError: null,
    });

    const log = async (message: string) => {
      await this.deployRepository.appendRunLog(run.id, redactSshTargets(`${message}\n`));
    };

    try {
      await log(`Deploy started for ${deployment.deployDomain}`);
      if (wasWaiting) {
        await log("Server was busy — previous deploy finished; starting this job now.");
      }

      const serverLabel = server.name?.trim() || "hosting server";
      await log(`Using ${serverLabel}`);

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.ALLOCATING_PORT);
      await log("Stage: allocating host port…");
      const resolvedPort = await this.portAllocation.resolveHostPort(server, {
        prefer: deployment.hostPort,
        containerName: deployment.containerName,
        runtime: resolveDeployRuntime(deployment.stack, deployment.source),
      });
      const hostPort = resolvedPort.port;
      if (resolvedPort.switchedFrom != null) {
        await this.deployRepository.update(deploymentId, { hostPort });
        await log(
          `Host port ${resolvedPort.switchedFrom} is busy — switched to free port ${hostPort}`,
        );
      } else if (!deployment.hostPort || deployment.hostPort !== hostPort) {
        await this.deployRepository.update(deploymentId, { hostPort });
        await log(`Allocated host port ${hostPort}`);
      } else {
        await log(`Using host port ${hostPort}`);
      }

      if (deployment.domainMode === "SUBDOMAIN") {
        await this.setStage(deploymentId, run.id, DEPLOY_STAGES.CREATING_SUBDOMAIN);
        await log(`Stage: Plesk addon domain (${deployment.deployDomain})…`);
        const { siteId, created } = await this.pleskSite.ensureSubdomain(
          pleskServer,
          account,
          deployment.deployDomain,
        );
        await this.deployRepository.update(deploymentId, { pleskSiteId: siteId });
        await log(
          created
            ? `Created Plesk domain ${deployment.deployDomain} (site ${siteId})`
            : `Domain ${deployment.deployDomain} already exists (site ${siteId})`,
        );
      }

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.ENSURING_DEPENDENCIES);
      const isRedeploy = Boolean(deployment.deployPath && deployment.containerName);
      await log(
        isRedeploy
          ? `Stage: verify server tools on ${serverLabel}…`
          : `Stage: preparing ${serverLabel}…`,
      );
      const runtime = resolveDeployRuntime(deployment.stack, deployment.source);
      if (runtime === "docker") {
        const bootstrap = await this.serverBootstrap.ensureServerReady(
          server,
          async (update) => {
            if (update.logChunk) await log(update.logChunk.trimEnd());
          },
          { skipBootstrapIfReady: true },
        );
        await log(bootstrap.log);
        if (bootstrap.osVersionSaved) {
          await log(`Detected OS saved: ${bootstrap.detectedOs.prettyName}`);
        }
      } else {
        await log("Runtime: PM2 (Docker is not used for Next.js/NestJS deployments).");
      }

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.PREPARING_SERVER);
      const envVars = deployment.envVarsEnc
        ? (JSON.parse(decryptSecret(deployment.envVarsEnc)) as Record<string, string>)
        : {};

      const isDockerImage = deployment.source === "DOCKER_IMAGE";
      const isUpload = deployment.source === "UPLOAD";
      await this.setStage(
        deploymentId,
        run.id,
        isDockerImage ? DEPLOY_STAGES.BUILDING : DEPLOY_STAGES.CLONING_REPO,
      );
      await log(
        isDockerImage
          ? isRedeploy
            ? "Stage: pull Docker image & restart container…"
            : "Stage: pull Docker image & start container…"
          : isUpload
            ? isRedeploy
              ? "Stage: upload source archive again, rebuild & restart PM2 process…"
              : "Stage: upload source archive, build & start with PM2…"
            : isRedeploy
              ? "Stage: pull latest code, rebuild & restart PM2 process…"
              : "Stage: clone repository, build & start with PM2…",
      );
      const cloneUrl =
        isDockerImage || isUpload
          ? undefined
          : await this.githubDeploy.resolveCloneUrl(deployment.userId, deployment.repoUrl);
      const result = await this.remoteDeploy.deployApplication({
        server,
        proxyServer: pleskServer,
        proxyTargetHost: server.id === pleskServer.id ? "127.0.0.1" : server.ipAddress,
        account,
        projectName: deployment.name,
        stack: deployment.stack,
        source: deployment.source,
        runtime: runtime === "pm2" ? "PM2" : "DOCKER",
        imageRef: deployment.imageRef,
        sourceArchivePath: deployment.sourceArchivePath,
        repoUrl: deployment.repoUrl,
        cloneUrl,
        branch: deployment.branch,
        rootDirectory: deployment.rootDirectory,
        hostPort,
        containerPort: deployment.containerPort,
        diskLimitBytes:
          (account.autoDeployDiskGbOverride ?? account.plan.autoDeployDiskGb) * 1024 * 1024 * 1024,
        resourceLimits: {
          cpuPercent: account.autoDeployCpuPercentOverride ?? account.plan.autoDeployCpuPercent,
          memoryMb: account.autoDeployMemoryMbOverride ?? account.plan.autoDeployMemoryMb,
          diskGb: account.autoDeployDiskGbOverride ?? account.plan.autoDeployDiskGb,
        },
        envVars,
        deployDomain: deployment.deployDomain,
        existingDeployPath: isRedeploy ? deployment.deployPath : null,
        existingContainerName: isRedeploy ? deployment.containerName : null,
        onLog: async (chunk) => {
          await log(chunk);
        },
        onStage: async (stage) => {
          await this.setStage(deploymentId, run.id, stage);
        },
        abortSignal: abortController.signal,
      });

      if (this.aborted.has(deploymentId)) {
        throw new Error("Deploy cancelled");
      }

      const still = await this.deployRepository.findById(deploymentId);
      if (!still) return;

      await this.deployRepository.update(deploymentId, {
        status: "SUCCESS",
        stage: DEPLOY_STAGES.COMPLETED,
        lastError: null,
        runtime: runtime === "pm2" ? "PM2" : "DOCKER",
        deployPath: result.deployPath,
        containerName: result.containerName,
        lastDeployedAt: new Date(),
      });
      await this.deployRepository.updateAccountDeployUsage(account.id, result.diskUsedMb);
      await this.deployRepository.finishRun(run.id, "SUCCESS", DEPLOY_STAGES.COMPLETED);
      await log("Deploy completed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deploy failed";
      const existing = await this.deployRepository.findById(deploymentId);
      if (!existing) return;
      if (existing.status !== "RUNNING") return;
      if (this.requeueAfterAbort.has(deploymentId)) return;
      try {
        await log(`ERROR: ${message}`);
      } catch {
        /* run row may already be gone */
      }
      await this.deployRepository.update(deploymentId, {
        status: "FAILED",
        stage: DEPLOY_STAGES.FAILED,
        lastError: message === "Deploy cancelled" ? "Deploy cancelled" : message,
      });
      await this.deployRepository.finishRun(run.id, "FAILED", DEPLOY_STAGES.FAILED);
      this.staffAlerts.notify({
        kind: "AUTO_DEPLOY_FAILED",
        title: "Auto Deploy failed",
        lines: [
          `Application: ${deployment.name}`,
          `Domain: ${deployment.deployDomain}`,
          `Customer ID: ${deployment.userId}`,
          `Server: ${server.name}`,
          `Reason: ${message}`,
        ],
        url: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/az/t4abriz/panel/hosting/accounts`,
      });
    }
  }
}
