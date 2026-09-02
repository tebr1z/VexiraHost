import { randomUUID } from "node:crypto";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { HostingServer } from "@prisma/client";

import {
  applyBootstrapProgress,
  createInitialBootstrapSteps,
  type BootstrapJob,
  type BootstrapProgressUpdate,
} from "../types/bootstrap-job.types";
import { OS_DETECT_COMMAND } from "../utils/server-bootstrap.script";
import { formatOsVersionLabel, parseDetectedOsOutput } from "../utils/server-os.util";
import { hasDedicatedSshCredentials } from "../utils/server-ssh.util";
import { parseProbeLine, TOOLS_PROBE_COMMAND } from "../utils/server-tools.util";

import { ServerBootstrapService } from "./server-bootstrap.service";
import { SshService } from "./ssh.service";

import type { DeployConfig } from "@/config/deploy.config";
import { HostingServersRepository } from "@/modules/hosting/repository/hosting-servers.repository";

export type ServerSetupStatus = {
  server: {
    id: string;
    name: string;
    hostname: string;
    ipAddress: string;
    panel: string;
    osVersion: string | null;
    sshUsername: string | null;
    sshPort: number;
    sshConfigured: boolean;
  };
  mockRemote: boolean;
  tools: {
    git: string | null;
    docker: string | null;
    compose: string | null;
    os: string | null;
    probedAt: string;
  } | null;
  lastBootstrapLog: string | null;
  activeBootstrapJobId: string | null;
};

@Injectable()
export class ServerSetupService {
  private readonly bootstrapLogs = new Map<string, string>();
  private readonly bootstrapJobs = new Map<string, BootstrapJob>();
  private readonly activeJobByServer = new Map<string, string>();

  constructor(
    private readonly hostingServersRepository: HostingServersRepository,
    private readonly serverBootstrap: ServerBootstrapService,
    private readonly ssh: SshService,
    private readonly configService: ConfigService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  private async requireServer(id: string): Promise<HostingServer> {
    const server = await this.hostingServersRepository.findById(id);
    if (!server) throw new NotFoundException("Hosting server not found");
    return server;
  }

  async getStatus(serverId: string): Promise<ServerSetupStatus> {
    const server = await this.requireServer(serverId);
    return this.buildStatus(server);
  }

  getBootstrapJob(serverId: string, jobId: string): BootstrapJob {
    const job = this.bootstrapJobs.get(jobId);
    if (!job || job.serverId !== serverId) {
      throw new NotFoundException("Bootstrap job not found");
    }
    return job;
  }

  private buildStatus(server: HostingServer): ServerSetupStatus {
    return {
      server: {
        id: server.id,
        name: server.name,
        hostname: server.hostname,
        ipAddress: server.ipAddress,
        panel: server.panel,
        osVersion: server.osVersion,
        sshUsername: server.sshUsername,
        sshPort: server.sshPort ?? 22,
        sshConfigured: hasDedicatedSshCredentials(server) || Boolean(server.whmPasswordEnc),
      },
      mockRemote: this.deployConfig.mockRemote,
      tools: null,
      lastBootstrapLog: this.bootstrapLogs.get(server.id) ?? null,
      activeBootstrapJobId: this.activeJobByServer.get(server.id) ?? null,
    };
  }

  async probeTools(serverId: string): Promise<ServerSetupStatus> {
    const server = await this.requireServer(serverId);
    const status = this.buildStatus(server);

    if (this.deployConfig.mockRemote) {
      return {
        ...status,
        tools: {
          git: "git version 2.39.0 (mock)",
          docker: "Docker version 24.0.0 (mock)",
          compose: "Docker Compose version v2.20.0 (mock)",
          os: server.osVersion ?? "Ubuntu 22.04 LTS (mock)",
          probedAt: new Date().toISOString(),
        },
      };
    }

    const ssh = this.serverBootstrap.buildSshOptions(server);
    const output = await this.ssh.execChecked(ssh, TOOLS_PROBE_COMMAND, 60_000);
    const osOutput = await this.ssh.execChecked(ssh, OS_DETECT_COMMAND, 60_000);
    const detected = parseDetectedOsOutput(osOutput);

    return {
      ...status,
      tools: {
        git: parseProbeLine(output, "GIT"),
        docker: parseProbeLine(output, "DOCKER"),
        compose: parseProbeLine(output, "COMPOSE"),
        os: detected ? formatOsVersionLabel(detected) : null,
        probedAt: new Date().toISOString(),
      },
    };
  }

  async testSsh(serverId: string): Promise<{ ok: boolean; message: string; output: string }> {
    const server = await this.requireServer(serverId);

    if (this.deployConfig.mockRemote) {
      return { ok: true, message: "SSH connection OK (mock)", output: "VX_SSH_OK=1" };
    }

    const ssh = this.serverBootstrap.buildSshOptions(server);
    const output = await this.ssh.execChecked(ssh, 'echo "VX_SSH_OK=1"', 30_000);
    const ok = output.includes("VX_SSH_OK=1");
    return {
      ok,
      message: ok ? "SSH connection OK" : "SSH test failed",
      output: output.trim(),
    };
  }

  startBootstrap(serverId: string): { jobId: string } {
    const active = this.activeJobByServer.get(serverId);
    if (active) {
      const existing = this.bootstrapJobs.get(active);
      if (existing?.status === "running") {
        throw new BadRequestException("Bootstrap is already running on this server");
      }
    }

    const jobId = randomUUID();
    const job: BootstrapJob = {
      id: jobId,
      serverId,
      status: "running",
      currentStage: "connect",
      steps: createInitialBootstrapSteps(),
      log: "",
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };

    this.bootstrapJobs.set(jobId, job);
    this.activeJobByServer.set(serverId, jobId);

    void this.runBootstrapJob(jobId).catch(() => undefined);

    return { jobId };
  }

  private updateJob(jobId: string, patch: Partial<BootstrapJob>): void {
    const current = this.bootstrapJobs.get(jobId);
    if (!current) return;
    this.bootstrapJobs.set(jobId, { ...current, ...patch });
  }

  private appendJobLog(jobId: string, chunk: string): void {
    const current = this.bootstrapJobs.get(jobId);
    if (!current || !chunk) return;
    this.updateJob(jobId, { log: current.log + chunk });
  }

  private handleProgress(jobId: string, update: BootstrapProgressUpdate): void {
    const current = this.bootstrapJobs.get(jobId);
    if (!current) return;

    const steps = applyBootstrapProgress(current.steps, update);
    if (update.logChunk) {
      this.appendJobLog(jobId, update.logChunk);
    }

    this.updateJob(jobId, {
      steps,
      currentStage: update.stage,
    });
  }

  private async runBootstrapJob(jobId: string): Promise<void> {
    const job = this.bootstrapJobs.get(jobId);
    if (!job) return;

    try {
      const server = await this.requireServer(job.serverId);
      const result = await this.serverBootstrap.ensureServerReady(server, (update) =>
        this.handleProgress(jobId, update),
      );

      this.bootstrapLogs.set(job.serverId, result.log);

      try {
        await this.probeTools(job.serverId);
      } catch {
        // probe is best-effort after bootstrap
      }

      const current = this.bootstrapJobs.get(jobId);
      if (!current) return;

      this.updateJob(jobId, {
        status: "success",
        currentStage: "done",
        steps: applyBootstrapProgress(current.steps, { stage: "done", status: "success" }),
        finishedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bootstrap failed";
      const current = this.bootstrapJobs.get(jobId);
      if (current) {
        this.updateJob(jobId, {
          status: "failed",
          currentStage: current.currentStage,
          error: message,
          finishedAt: new Date().toISOString(),
        });
      }
    } finally {
      const finished = this.bootstrapJobs.get(jobId);
      if (finished && finished.status !== "running") {
        this.activeJobByServer.delete(finished.serverId);
      }
    }
  }
}
