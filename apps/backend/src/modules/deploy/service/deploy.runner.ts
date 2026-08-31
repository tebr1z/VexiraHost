import { Injectable, Logger } from "@nestjs/common";
import { ServiceStatus } from "@prisma/client";

import { DeployRepository } from "../repository/deploy.repository";
import { DEPLOY_STAGES } from "../types/deploy-stage";

import { PleskSiteService } from "./plesk-site.service";
import { PortAllocationService } from "./port-allocation.service";
import { RemoteDeployService } from "./remote-deploy.service";
import { ServerBootstrapService } from "./server-bootstrap.service";

import { decryptSecret } from "@/utils/crypto.util";

@Injectable()
export class DeployRunner {
  private readonly logger = new Logger(DeployRunner.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly deployRepository: DeployRepository,
    private readonly portAllocation: PortAllocationService,
    private readonly pleskSite: PleskSiteService,
    private readonly remoteDeploy: RemoteDeployService,
    private readonly serverBootstrap: ServerBootstrapService,
  ) {}

  enqueue(deploymentId: string): void {
    if (this.running.has(deploymentId)) return;
    this.running.add(deploymentId);
    void this.run(deploymentId)
      .catch((error) => {
        this.logger.error(
          `Unhandled deploy error for ${deploymentId}: ${
            error instanceof Error ? error.message : "unknown"
          }`,
        );
      })
      .finally(() => {
        this.running.delete(deploymentId);
      });
  }

  private async setStage(deploymentId: string, runId: string, stage: string) {
    await this.deployRepository.update(deploymentId, { stage, status: "RUNNING" });
    await this.deployRepository.updateRunStage(runId, stage);
  }

  private async run(deploymentId: string): Promise<void> {
    const deployment = await this.deployRepository.findById(deploymentId);
    if (!deployment) return;

    const account = deployment.hostingAccount;
    const server = account.server;
    if (!server) {
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

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.ALLOCATING_PORT);
      let hostPort = deployment.hostPort;
      if (!hostPort) {
        hostPort = await this.portAllocation.allocate(server.id);
        await this.deployRepository.update(deploymentId, { hostPort });
        await log(`Allocated host port ${hostPort}`);
      }

      if (deployment.domainMode === "SUBDOMAIN") {
        await this.setStage(deploymentId, run.id, DEPLOY_STAGES.CREATING_SUBDOMAIN);
        const { siteId, created } = await this.pleskSite.ensureSubdomain(
          server,
          account,
          deployment.deployDomain,
        );
        await this.deployRepository.update(deploymentId, { pleskSiteId: siteId });
        await log(
          created
            ? `Created Plesk subdomain ${deployment.deployDomain} (site ${siteId})`
            : `Subdomain ${deployment.deployDomain} already exists (site ${siteId})`,
        );
      }

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.ENSURING_DEPENDENCIES);
      const bootstrap = await this.serverBootstrap.ensureServerReady(server);
      await log(bootstrap.log);
      if (bootstrap.osVersionSaved) {
        await log(`Detected OS saved: ${bootstrap.detectedOs.prettyName}`);
      }

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.PREPARING_SERVER);
      const envVars = deployment.envVarsEnc
        ? (JSON.parse(decryptSecret(deployment.envVarsEnc)) as Record<string, string>)
        : {};

      await this.setStage(deploymentId, run.id, DEPLOY_STAGES.CLONING_REPO);
      const result = await this.remoteDeploy.deployApplication({
        server,
        account,
        projectName: deployment.name,
        stack: deployment.stack,
        repoUrl: deployment.repoUrl,
        branch: deployment.branch,
        rootDirectory: deployment.rootDirectory,
        hostPort,
        containerPort: deployment.containerPort,
        envVars,
        deployDomain: deployment.deployDomain,
      });

      await log(result.log);

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
