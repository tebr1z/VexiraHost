import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { HostingServer } from "@prisma/client";

import type { BootstrapStageId } from "../types/bootstrap-job.types";
import { buildServerBootstrapScript, OS_DETECT_COMMAND } from "../utils/server-bootstrap.script";
import {
  formatOsVersionLabel,
  inferOsFamilyFromLabel,
  parseDetectedOsOutput,
  type DetectedOs,
} from "../utils/server-os.util";
import { resolveHostingServerSshOptions } from "../utils/server-ssh.util";
import {
  isDeployToolPresent,
  parseProbeLine,
  TOOLS_PROBE_COMMAND,
} from "../utils/server-tools.util";

import { SshService, type SshConnectionOptions, type SshSession } from "./ssh.service";

import type { DeployConfig } from "@/config/deploy.config";
import { PrismaService } from "@/database/database.module";

export type ServerBootstrapResult = {
  detectedOs: DetectedOs;
  osVersionSaved: boolean;
  log: string;
};

export type BootstrapProgressHandler = (update: {
  stage: BootstrapStageId | "done";
  status: "running" | "success" | "failed";
  message?: string;
  logChunk?: string;
}) => void;

@Injectable()
export class ServerBootstrapService {
  private readonly logger = new Logger(ServerBootstrapService.name);

  constructor(
    private readonly ssh: SshService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  buildSshOptions(server: HostingServer): SshConnectionOptions {
    const cfg = this.deployConfig;
    const options = resolveHostingServerSshOptions(server, cfg.sshPort);
    if (cfg.sshUser) {
      return { ...options, username: cfg.sshUser };
    }
    return options;
  }

  async ensureServerReady(
    server: HostingServer,
    onProgress?: BootstrapProgressHandler,
    options?: { skipBootstrapIfReady?: boolean },
  ): Promise<ServerBootstrapResult> {
    const emit = onProgress ?? (() => undefined);
    const cfg = this.deployConfig;
    if (cfg.mockRemote) {
      emit({ stage: "connect", status: "running", logChunk: "[mock] Connecting via SSH…\n" });
      await delay(400);
      emit({ stage: "connect", status: "success", message: "SSH OK (mock)" });
      emit({ stage: "detect_os", status: "running", logChunk: "[mock] Detecting OS…\n" });
      await delay(500);
      const detectedOs: DetectedOs = {
        id: "ubuntu",
        versionId: "22.04",
        prettyName: server.osVersion ?? "Ubuntu 22.04 LTS (mock)",
        family: "debian",
      };
      emit({
        stage: "detect_os",
        status: "success",
        message: detectedOs.prettyName,
        logChunk: `OS: ${detectedOs.prettyName}\n`,
      });
      emit({ stage: "save_os", status: "success", message: "Skipped (mock)" });
      emit({
        stage: "upload_script",
        status: "running",
        logChunk: "[mock] Uploading bootstrap script…\n",
      });
      await delay(400);
      emit({ stage: "upload_script", status: "success" });
      emit({
        stage: "install_packages",
        status: "running",
        logChunk: "[mock] Installing git & Docker…\n",
      });
      await delay(1200);
      emit({
        stage: "install_packages",
        status: "success",
        logChunk: "[mock] git & Docker installed\n",
      });
      emit({ stage: "verify", status: "running", logChunk: "[mock] Verifying tools…\n" });
      await delay(400);
      emit({ stage: "verify", status: "success", message: "All tools OK (mock)" });
      emit({ stage: "done", status: "success", logChunk: "[mock] Bootstrap complete\n" });
      return {
        detectedOs,
        osVersionSaved: false,
        log: "[mock] Skipped OS detect and package bootstrap — DEPLOY_MOCK_REMOTE=true\n",
      };
    }

    const ssh = this.buildSshOptions(server);
    const logs: string[] = [];

    const append = (label: string, output: string) => {
      logs.push(`\n--- ${label} ---\n${output.trim()}`);
    };

    try {
      return await this.ssh.withSession(
        ssh,
        async (session) => {
          emit({
            stage: "connect",
            status: "running",
            logChunk: `Connecting via SSH (${session.target})…\n`,
          });
          await session.execChecked('echo "VX_SSH_OK=1"', 30_000);
          emit({ stage: "connect", status: "success", message: "Connected" });

          emit({ stage: "detect_os", status: "running", logChunk: "Reading /etc/os-release…\n" });
          let detected = await this.detectOs(session);
          append("os detect", this.formatOsLog(detected));
          emit({
            stage: "detect_os",
            status: "success",
            message: detected.prettyName,
            logChunk: `${this.formatOsLog(detected)}\n`,
          });

          if (!detected.family) {
            const hint = inferOsFamilyFromLabel(server.osVersion);
            if (hint) {
              detected = { ...detected, family: hint };
              append("os hint", `Using admin-configured OS family: ${hint}`);
              emit({
                stage: "detect_os",
                status: "running",
                logChunk: `Using OS family hint: ${hint}\n`,
              });
            }
          }

          if (!detected.family) {
            emit({
              stage: "detect_os",
              status: "failed",
              message: `Unsupported OS: ${detected.prettyName}`,
            });
            throw new Error(
              `Unsupported server OS "${detected.prettyName}". Set OS version in admin (Ubuntu or AlmaLinux) or use a supported distro.`,
            );
          }

          emit({ stage: "save_os", status: "running" });
          let osVersionSaved = false;
          const pretty = formatOsVersionLabel(detected);
          if (!server.osVersion?.trim()) {
            await this.prisma.hostingServer.update({
              where: { id: server.id },
              data: { osVersion: pretty },
            });
            osVersionSaved = true;
            append("os version", `Saved detected OS to server record: ${pretty}`);
            emit({
              stage: "save_os",
              status: "success",
              message: pretty,
              logChunk: `Saved OS: ${pretty}\n`,
            });
          } else {
            emit({ stage: "save_os", status: "success", message: "Already configured" });
          }

          if (options?.skipBootstrapIfReady) {
            emit({
              stage: "verify",
              status: "running",
              logChunk: "Checking if git & Docker are already installed…\n",
            });
            const probeOutput = await session.execChecked(TOOLS_PROBE_COMMAND, 60_000);
            const git = parseProbeLine(probeOutput, "GIT");
            const docker = parseProbeLine(probeOutput, "DOCKER");
            const dockerInfo = await session.exec("docker info >/dev/null 2>&1");

            if (isDeployToolPresent(git) && isDeployToolPresent(docker) && dockerInfo.code === 0) {
              append("bootstrap", "Skipped — git and Docker already installed");
              emit({ stage: "upload_script", status: "success", message: "Skipped" });
              emit({ stage: "install_packages", status: "success", message: "Skipped" });
              emit({
                stage: "verify",
                status: "success",
                message: "git & Docker OK",
                logChunk: "Bootstrap skipped — server is already ready for deploy.\n",
              });
              emit({ stage: "done", status: "success" });
              this.logger.log(`Server ${server.id} bootstrap skipped (tools already present)`);
              return {
                detectedOs: detected,
                osVersionSaved,
                log: logs.join("\n"),
              };
            }

            emit({
              stage: "verify",
              status: "running",
              logChunk: "Tools missing or Docker daemon not running — running full bootstrap…\n",
            });
          }

          const preferredFamily = inferOsFamilyFromLabel(server.osVersion) ?? detected.family;
          const script = buildServerBootstrapScript(preferredFamily);
          const remotePath = `/tmp/vexira-bootstrap-${server.id}.sh`;

          emit({
            stage: "upload_script",
            status: "running",
            logChunk: "Uploading bootstrap script…\n",
          });
          await session.writeFile(remotePath, script, "755");
          emit({ stage: "upload_script", status: "success" });

          emit({
            stage: "install_packages",
            status: "running",
            logChunk:
              "Running bootstrap (git, Docker, Docker Compose)…\nThis may take several minutes.\n",
          });
          const bootstrapOutput = await session.execChecked(
            `bash ${shellQuote(remotePath)}; rm -f ${shellQuote(remotePath)}`,
            900_000,
          );
          append("bootstrap", bootstrapOutput);
          emit({
            stage: "install_packages",
            status: "running",
            logChunk: `${bootstrapOutput.trim()}\n`,
          });

          if (!bootstrapOutput.includes("VX_BOOTSTRAP_OK=1")) {
            emit({
              stage: "install_packages",
              status: "failed",
              message: "Bootstrap script did not finish successfully",
            });
            throw new Error("Server bootstrap did not complete successfully");
          }
          emit({ stage: "install_packages", status: "success", message: "Packages installed" });

          emit({ stage: "verify", status: "running", logChunk: "Verifying git & Docker…\n" });
          emit({ stage: "verify", status: "success", message: "git & Docker OK" });
          emit({
            stage: "done",
            status: "success",
            logChunk: "Bootstrap completed successfully.\n",
          });

          this.logger.log(`Server ${server.id} bootstrap OK (${pretty})`);

          return {
            detectedOs: detected,
            osVersionSaved,
            log: logs.join("\n"),
          };
        },
        1_200_000,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bootstrap failed";
      emit({ stage: "done", status: "failed", logChunk: `ERROR: ${message}\n` });
      throw error;
    }
  }

  private async detectOs(session: SshSession): Promise<DetectedOs> {
    const output = await session.execChecked(OS_DETECT_COMMAND, 60_000);
    const parsed = parseDetectedOsOutput(output);
    if (!parsed) {
      throw new Error("Could not detect server OS from /etc/os-release");
    }
    return parsed;
  }

  private formatOsLog(detected: DetectedOs): string {
    return [
      `ID: ${detected.id}`,
      `Version: ${detected.versionId || "—"}`,
      `Pretty: ${detected.prettyName}`,
      `Family: ${detected.family ?? "unknown"}`,
    ].join("\n");
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
