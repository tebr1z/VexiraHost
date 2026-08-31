import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DeployStack, HostingAccount, HostingServer } from "@prisma/client";

import {
  buildApacheProxyDirectives,
  pleskVhostConfPath,
  pleskVhostSslConfPath,
} from "../utils/apache-proxy.util";
import { buildDockerComposeProjectName, buildDockerfile } from "../utils/docker-templates.util";
import { resolveHostingServerSshOptions } from "../utils/server-ssh.util";

import { SshService, type SshConnectionOptions } from "./ssh.service";

import type { DeployConfig } from "@/config/deploy.config";

@Injectable()
export class ApacheProxyService {
  constructor(
    private readonly ssh: SshService,
    private readonly configService: ConfigService,
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

  async applyReverseProxy(server: HostingServer, domain: string, hostPort: number): Promise<void> {
    const ssh = this.buildSshOptions(server);
    const directives = buildApacheProxyDirectives(hostPort);
    const httpPath = pleskVhostConfPath(domain);
    const httpsPath = pleskVhostSslConfPath(domain);
    const tmpHttp = `/tmp/vexira-vhost-${Date.now()}.conf`;
    const tmpHttps = `/tmp/vexira-vhost-ssl-${Date.now()}.conf`;

    await this.ssh.writeFile(ssh, tmpHttp, directives);
    await this.ssh.writeFile(ssh, tmpHttps, directives);

    const script = [
      `mkdir -p $(dirname ${shellQuote(httpPath)})`,
      `cp ${shellQuote(tmpHttp)} ${shellQuote(httpPath)}`,
      `cp ${shellQuote(tmpHttps)} ${shellQuote(httpsPath)}`,
      `plesk repair web -domain ${shellQuote(domain)} -y`,
      `rm -f ${shellQuote(tmpHttp)} ${shellQuote(tmpHttps)}`,
    ].join(" && ");

    await this.ssh.execChecked(ssh, script, 300_000);
  }
}

@Injectable()
export class RemoteDeployService {
  constructor(
    private readonly ssh: SshService,
    private readonly apacheProxy: ApacheProxyService,
    private readonly configService: ConfigService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  resolveDeployPath(accountId: string, projectName: string): string {
    const base = this.deployConfig.basePath.replace(/\/$/, "");
    return `${base}/${accountId}/${projectName}`;
  }

  async deployApplication(input: {
    server: HostingServer;
    account: HostingAccount;
    projectName: string;
    stack: DeployStack;
    repoUrl: string;
    branch: string;
    rootDirectory?: string | null;
    hostPort: number;
    containerPort: number;
    envVars: Record<string, string>;
    deployDomain: string;
  }): Promise<{ deployPath: string; containerName: string; log: string }> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) {
      const deployPath = this.resolveDeployPath(input.account.id, input.projectName);
      return {
        deployPath,
        containerName: `mock-${input.projectName}`,
        log: "[mock] Skipped SSH/docker — DEPLOY_MOCK_REMOTE=true\n",
      };
    }

    const ssh = this.apacheProxy.buildSshOptions(input.server);
    const deployPath = this.resolveDeployPath(input.account.id, input.projectName);
    const containerName = buildDockerComposeProjectName(input.account.id, input.projectName);
    const logs: string[] = [];

    const append = (label: string, output: string) => {
      logs.push(`\n--- ${label} ---\n${output.trim()}`);
    };

    await this.ssh.execChecked(
      ssh,
      `mkdir -p ${shellQuote(deployPath)} && rm -rf ${shellQuote(`${deployPath}/repo`)}`,
    );

    const cloneCmd = [
      `git clone --depth 1 --branch ${shellQuote(input.branch)} ${shellQuote(input.repoUrl)} ${shellQuote(`${deployPath}/repo`)}`,
    ].join(" ");
    append("git clone", await this.ssh.execChecked(ssh, cloneCmd, 600_000));

    const workDir = input.rootDirectory
      ? `${deployPath}/repo/${input.rootDirectory.replace(/^\/+/, "")}`
      : `${deployPath}/repo`;

    const envLines = Object.entries(input.envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const envContent = `${envLines}\nPORT=${input.containerPort}\n`;
    await this.ssh.writeFile(ssh, `${deployPath}/.env`, envContent);

    const dockerfilePath = `${workDir}/Dockerfile`;
    const dockerfile = buildDockerfile(input.stack);
    await this.ssh.writeFile(ssh, dockerfilePath, dockerfile);

    const buildCmd = `cd ${shellQuote(workDir)} && docker build -t ${shellQuote(containerName)} .`;
    append("docker build", await this.ssh.execChecked(ssh, buildCmd, 900_000));

    await this.ssh.execChecked(
      ssh,
      `docker rm -f ${shellQuote(containerName)} >/dev/null 2>&1 || true`,
    );

    const runCmd = [
      `docker run -d`,
      `--name ${shellQuote(containerName)}`,
      `--restart unless-stopped`,
      `-p 127.0.0.1:${input.hostPort}:${input.containerPort}`,
      `--env-file ${shellQuote(`${deployPath}/.env`)}`,
      shellQuote(containerName),
    ].join(" ");
    append("docker run", await this.ssh.execChecked(ssh, runCmd));

    await this.apacheProxy.applyReverseProxy(input.server, input.deployDomain, input.hostPort);
    append(
      "apache proxy",
      `Reverse proxy configured for ${input.deployDomain} → 127.0.0.1:${input.hostPort}`,
    );

    return {
      deployPath,
      containerName,
      log: logs.join("\n"),
    };
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
