import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { HostingServer } from "@prisma/client";

import { buildServerBootstrapScript, OS_DETECT_COMMAND } from "../utils/server-bootstrap.script";
import {
  formatOsVersionLabel,
  inferOsFamilyFromLabel,
  parseDetectedOsOutput,
  type DetectedOs,
} from "../utils/server-os.util";
import { resolveHostingServerSshOptions } from "../utils/server-ssh.util";

import { SshService, type SshConnectionOptions } from "./ssh.service";

import type { DeployConfig } from "@/config/deploy.config";
import { PrismaService } from "@/database/database.module";

export type ServerBootstrapResult = {
  detectedOs: DetectedOs;
  osVersionSaved: boolean;
  log: string;
};

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

  async ensureServerReady(server: HostingServer): Promise<ServerBootstrapResult> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) {
      const detectedOs: DetectedOs = {
        id: "ubuntu",
        versionId: "22.04",
        prettyName: server.osVersion ?? "Ubuntu 22.04 LTS (mock)",
        family: "debian",
      };
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

    let detected = await this.detectOs(ssh);
    append("os detect", this.formatOsLog(detected));

    if (!detected.family) {
      const hint = inferOsFamilyFromLabel(server.osVersion);
      if (hint) {
        detected = { ...detected, family: hint };
        append("os hint", `Using admin-configured OS family: ${hint}`);
      }
    }

    if (!detected.family) {
      throw new Error(
        `Unsupported server OS "${detected.prettyName}". Set OS version in admin (Ubuntu or AlmaLinux) or use a supported distro.`,
      );
    }

    let osVersionSaved = false;
    const pretty = formatOsVersionLabel(detected);
    if (!server.osVersion?.trim()) {
      await this.prisma.hostingServer.update({
        where: { id: server.id },
        data: { osVersion: pretty },
      });
      osVersionSaved = true;
      append("os version", `Saved detected OS to server record: ${pretty}`);
    }

    const preferredFamily = inferOsFamilyFromLabel(server.osVersion) ?? detected.family;
    const script = buildServerBootstrapScript(preferredFamily);
    const remotePath = `/tmp/vexira-bootstrap-${server.id}.sh`;

    await this.ssh.writeFile(ssh, remotePath, script, "755");
    const bootstrapOutput = await this.ssh.execChecked(
      ssh,
      `bash ${shellQuote(remotePath)}; rm -f ${shellQuote(remotePath)}`,
      900_000,
    );
    append("bootstrap", bootstrapOutput);

    if (!bootstrapOutput.includes("VX_BOOTSTRAP_OK=1")) {
      throw new Error("Server bootstrap did not complete successfully");
    }

    this.logger.log(`Server ${server.id} bootstrap OK (${pretty})`);

    return {
      detectedOs: detected,
      osVersionSaved,
      log: logs.join("\n"),
    };
  }

  private async detectOs(ssh: SshConnectionOptions): Promise<DetectedOs> {
    const output = await this.ssh.execChecked(ssh, OS_DETECT_COMMAND, 60_000);
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
