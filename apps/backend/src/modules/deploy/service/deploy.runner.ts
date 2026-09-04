import { Injectable, Logger } from "@nestjs/common";
import { ServiceStatus } from "@prisma/client";

import { DeployRepository } from "../repository/deploy.repository";
import { DEPLOY_STAGES } from "../types/deploy-stage";
import { resolveHostingServerSshOptions } from "../utils/server-ssh.util";

import { GitHubDeployService } from "./github-deploy.service";
import { PleskSiteService } from "./plesk-site.service";
import { PortAllocationService } from "./port-allocation.service";
import { RemoteDeployService } from "./remote-deploy.service";
import { ServerBootstrapService } from "./server-bootstrap.service";
import { formatSshTarget } from "./ssh.service";

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

  constructor(
    private readonly deployRepository: DeployRepository,
    private readonly portAllocation: PortAllocationService,
    private readonly pleskSite: PleskSiteService,
    private readonly remoteDeploy: RemoteDeployService,
    private readonly serverBootstrap: ServerBootstrapService,
    private readonly githubDeploy: GitHubDeployService,
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

    const serverId = deployment.hostingAccount.serverId;
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
    await this.deployRepository.update(deploymentId, { stage, status: "RUNNING" });
    await this.deployRepository.updateRunStage(runId, stage);
  }

  private async run(deploymentId: string, expectedServerId: string): Promise<void> {
    const deployment = await this.deployRepository.findById(deploymentId);
    if (!deployment) {
      this.logger.log(`Deploy ${deploymentId} was cancelled before start — skipping`);
      return;
    }

    const account = deployment.hostingAccount;
    const server = account.server;
    if (!server || account.serverId !== expectedServerId) {
      await this.deployRepository.update(deploymentId, {
        status: "FAILED",
        stage: DEPLOY_STAGES.FAILED,
        lastError: "Hosting server is not assigned",
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

    const wasWaiting = deployment.stage === DEPLOY_STAGES.WAITING_SERVER;
    const run = await this.deployRepository.createRun(deploymentId);
    await this.deployRepository.update(deploymentId, {
      status: "RUNNING",
      stage: DEPLOY_STAGES.QUEUED,
      lastError: null,
    });

    const log = async (message: string) => {
      await this.deployRepository.appendRunLog(run.id, `${message}\n`);
    };

    try {
      await log(`Deploy started for ${deployment.deployDomain}`);
      if (wasWaiting) {
        await log("Server was busy — previous deploy finished; starting this job now.");
      }

      const sshTarget = formatSshTarget(
        resolveHostingServerSshOptions(server, server.sshPort ?? 22),
      );
      await log(`Server SSH target: ${sshTarget}`);

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.ALLOCATING_PORT);
      await log("Stage: allocating host port…");
      let hostPort = deployment.hostPort;
      if (!hostPort) {
        hostPort = await this.portAllocation.allocate(server.id);
        await this.deployRepository.update(deploymentId, { hostPort });
        await log(`Allocated host port ${hostPort}`);
      }

      if (deployment.domainMode === "SUBDOMAIN") {
        await this.setStage(deploymentId, run.id, DEPLOY_STAGES.CREATING_SUBDOMAIN);
        await log(`Stage: Plesk addon domain (${deployment.deployDomain})…`);
        const { siteId, created } = await this.pleskSite.ensureSubdomain(
          server,
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
          ? `Stage: verify server tools (${sshTarget})…`
          : `Stage: server bootstrap via SSH (${sshTarget})…`,
      );
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

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.PREPARING_SERVER);
      const envVars = deployment.envVarsEnc
        ? (JSON.parse(decryptSecret(deployment.envVarsEnc)) as Record<string, string>)
        : {};

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.CLONING_REPO);
      await log(
        isRedeploy
          ? "Stage: pull latest code, rebuild image & restart container…"
          : "Stage: clone repository, Docker build & start…",
      );
      const cloneUrl = await this.githubDeploy.resolveCloneUrl(
        deployment.userId,
        deployment.repoUrl,
      );
      const result = await this.remoteDeploy.deployApplication({
        server,
        account,
        projectName: deployment.name,
        stack: deployment.stack,
        repoUrl: deployment.repoUrl,
        cloneUrl,
        branch: deployment.branch,
        rootDirectory: deployment.rootDirectory,
        hostPort,
        containerPort: deployment.containerPort,
        envVars,
        deployDomain: deployment.deployDomain,
        existingDeployPath: isRedeploy ? deployment.deployPath : null,
        existingContainerName: isRedeploy ? deployment.containerName : null,
        onLog: async (chunk) => {
          await log(chunk);
        },
      });

      await this.deployRepository.update(deploymentId, {
        status: "SUCCESS",
        stage: DEPLOY_STAGES.COMPLETED,
        lastError: null,
        deployPath: result.deployPath,
        containerName: result.containerName,
        lastDeployedAt: new Date(),
      });
      await this.deployRepository.finishRun(run.id, "SUCCESS", DEPLOY_STAGES.COMPLETED);
      await log("Deploy completed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deploy failed";
      await log(`ERROR: ${message}`);
      await this.deployRepository.update(deploymentId, {
        status: "FAILED",
        stage: DEPLOY_STAGES.FAILED,
        lastError: message,
      });
      await this.deployRepository.finishRun(run.id, "FAILED", DEPLOY_STAGES.FAILED);
    }
  }
}
