import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DeployStack, HostingAccount, HostingServer } from "@prisma/client";

import {
  buildApacheProxyDirectives,
  buildPleskApacheReloadCommand,
  pleskVhostConfPath,
  pleskVhostSslConfPath,
} from "../utils/apache-proxy.util";
import {
  buildDockerComposeProjectName,
  buildDockerfile,
  sanitizeAppSubdir,
} from "../utils/docker-templates.util";
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
      buildPleskApacheReloadCommand(domain),
      `rm -f ${shellQuote(tmpHttp)} ${shellQuote(tmpHttps)}`,
    ].join(" && ");

    await this.ssh.execChecked(ssh, script, 300_000);
  }

  async clearReverseProxy(server: HostingServer, domain: string): Promise<void> {
    const ssh = this.buildSshOptions(server);
    const httpPath = pleskVhostConfPath(domain);
    const httpsPath = pleskVhostSslConfPath(domain);
    const script = [
      `rm -f ${shellQuote(httpPath)} ${shellQuote(httpsPath)}`,
      buildPleskApacheReloadCommand(domain),
    ].join("; ");
    await this.ssh.exec(ssh, script, 300_000);
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
    cloneUrl?: string;
    branch: string;
    rootDirectory?: string | null;
    hostPort: number;
    containerPort: number;
    envVars: Record<string, string>;
    deployDomain: string;
    existingDeployPath?: string | null;
    existingContainerName?: string | null;
    onLog?: (chunk: string) => void | Promise<void>;
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
    const deployPath =
      input.existingDeployPath?.trim() ||
      this.resolveDeployPath(input.account.id, input.projectName);
    const containerName =
      input.existingContainerName?.trim() ||
      buildDockerComposeProjectName(input.account.id, input.projectName);
    const isRedeploy = Boolean(input.existingDeployPath && input.existingContainerName);
    const logs: string[] = [];

    const append = async (label: string, output: string) => {
      const chunk = `\n--- ${label} ---\n${output.trim()}\n`;
      logs.push(chunk);
      if (input.onLog) await input.onLog(chunk);
    };

    await this.ssh.withSession(
      ssh,
      async (session) => {
        await append("ssh", `Connected to ${session.target}`);

        await session.execChecked(`mkdir -p ${shellQuote(deployPath)}`);

        const repoPath = `${deployPath}/repo`;
        const repoExists =
          (await session.exec(`test -d ${shellQuote(`${repoPath}/.git`)}`)).code === 0;

        if (isRedeploy && repoExists) {
          await append("prepare", `Redeploy — reusing ${deployPath}`);
          const cloneTarget = input.cloneUrl ?? input.repoUrl;
          // Previous deploys write a generated Dockerfile into the repo; force-clean
          // so fetch/checkout is not blocked by those local changes.
          const updateCmd = [
            `cd ${shellQuote(repoPath)}`,
            `git remote set-url origin ${shellQuote(cloneTarget)}`,
            `git fetch --depth 1 origin ${shellQuote(input.branch)}`,
            `git reset --hard FETCH_HEAD`,
            `git clean -fd`,
            `git checkout -f -B ${shellQuote(input.branch)} FETCH_HEAD`,
            `git reset --hard FETCH_HEAD`,
          ].join(" && ");
          await append("git pull", await session.execChecked(updateCmd, 600_000));
        } else {
          await session.execChecked(`rm -rf ${shellQuote(repoPath)}`);
          await append("prepare", `Deploy path: ${deployPath}`);

          const cloneTarget = input.cloneUrl ?? input.repoUrl;
          const cloneCmd = [
            `git clone --depth 1 --branch ${shellQuote(input.branch)} ${shellQuote(cloneTarget)} ${shellQuote(repoPath)}`,
          ].join(" ");
          await append("git clone", await session.execChecked(cloneCmd, 600_000));
        }

        const repoRoot = repoPath;
        const rootDirRaw = input.rootDirectory?.replace(/^\/+/, "").replace(/\/+$/, "") ?? "";
        let appSubdir = ".";
        try {
          appSubdir = sanitizeAppSubdir(rootDirRaw || ".");
        } catch {
          throw new BadRequestException("Invalid monorepo path in root directory");
        }

        const workspaceProbe = await session.exec(
          `test -f ${shellQuote(`${repoRoot}/pnpm-workspace.yaml`)}`,
        );
        const monorepo = workspaceProbe.code === 0;
        const dockerContextDir = monorepo
          ? repoRoot
          : rootDirRaw
            ? `${repoRoot}/${rootDirRaw}`
            : repoRoot;

        if (monorepo && appSubdir === ".") {
          throw new BadRequestException(
            "This repository is a pnpm monorepo. Set monorepo path to the app folder (e.g. apps/frontend).",
          );
        }

        const envLines = Object.entries(input.envVars)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");
        const envContent = `${envLines}\nPORT=${input.containerPort}\n`;
        await session.writeFile(`${deployPath}/.env`, envContent);

        if (input.stack === "NEXTJS") {
          const nextEnvPath =
            monorepo && appSubdir !== "."
              ? `${repoRoot}/${appSubdir}/.env.production`
              : `${dockerContextDir}/.env.production`;
          await session.writeFile(nextEnvPath, envContent);
        }

        // Keep generated Dockerfile outside the git worktree so redeploy `git pull`
        // is never blocked by local Dockerfile edits from a previous deploy.
        const dockerfilePath = `${deployPath}/Dockerfile`;
        const dockerfile = buildDockerfile(input.stack, { monorepo, appSubdir });
        await session.writeFile(dockerfilePath, dockerfile);

        const buildCmd = [
          `docker build`,
          `-f ${shellQuote(dockerfilePath)}`,
          `-t ${shellQuote(containerName)}`,
          shellQuote(dockerContextDir),
        ].join(" ");
        await append("docker build", await session.execChecked(buildCmd, 900_000));

        const containerInspect = await session.exec(
          `docker ps -a --filter name=^/${containerName}$ --format '{{.Names}}'`,
        );
        const containerExists = containerInspect.stdout.trim() === containerName;

        if (containerExists) {
          await append(
            "docker",
            `Updating existing container ${containerName} (stop → replace image → start with same name)…`,
          );
          await session.execChecked(`docker stop ${shellQuote(containerName)}`, 120_000);
          await session.execChecked(`docker rm ${shellQuote(containerName)}`, 60_000);
        } else {
          await session.execChecked(
            `docker rm -f ${shellQuote(containerName)} >/dev/null 2>&1 || true`,
          );
        }

        const runCmd = [
          `docker run -d`,
          `--name ${shellQuote(containerName)}`,
          `--restart unless-stopped`,
          `-p 127.0.0.1:${input.hostPort}:${input.containerPort}`,
          `--env-file ${shellQuote(`${deployPath}/.env`)}`,
          shellQuote(containerName),
        ].join(" ");
        await append("docker run", await session.execChecked(runCmd));
      },
      1_800_000,
    );

    if (isRedeploy) {
      await append(
        "apache proxy",
        `Skipped — existing reverse proxy for ${input.deployDomain} unchanged`,
      );
    } else {
      await this.apacheProxy.applyReverseProxy(input.server, input.deployDomain, input.hostPort);
      await append(
        "apache proxy",
        `Reverse proxy configured for ${input.deployDomain} → 127.0.0.1:${input.hostPort}`,
      );
    }

    return {
      deployPath,
      containerName,
      log: logs.join("\n"),
    };
  }

  async restartContainer(input: {
    server: HostingServer;
    deployPath: string;
    containerName: string;
    hostPort: number;
    containerPort: number;
    envVars: Record<string, string>;
  }): Promise<void> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) return;

    const ssh = this.apacheProxy.buildSshOptions(input.server);
    const envLines = Object.entries(input.envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const envContent = `${envLines}\nPORT=${input.containerPort}\n`;
    await this.ssh.writeFile(ssh, `${input.deployPath}/.env`, envContent);

    const containerInspect = await this.ssh.exec(
      ssh,
      `docker ps -a --filter name=^/${input.containerName}$ --format '{{.Names}}'`,
    );
    const containerExists = containerInspect.stdout.trim() === input.containerName;

    if (containerExists) {
      await this.ssh.execChecked(ssh, `docker stop ${shellQuote(input.containerName)}`, 120_000);
      await this.ssh.execChecked(ssh, `docker rm ${shellQuote(input.containerName)}`, 60_000);
    } else {
      await this.ssh.execChecked(
        ssh,
        `docker rm -f ${shellQuote(input.containerName)} >/dev/null 2>&1 || true`,
      );
    }

    const runCmd = [
      `docker run -d`,
      `--name ${shellQuote(input.containerName)}`,
      `--restart unless-stopped`,
      `-p 127.0.0.1:${input.hostPort}:${input.containerPort}`,
      `--env-file ${shellQuote(`${input.deployPath}/.env`)}`,
      shellQuote(input.containerName),
    ].join(" ");
    await this.ssh.execChecked(ssh, runCmd);
  }

  async removeDeployment(input: {
    server: HostingServer;
    deployPath?: string | null;
    containerName?: string | null;
    deployDomain?: string | null;
  }): Promise<void> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) return;

    const ssh = this.apacheProxy.buildSshOptions(input.server);

    await this.ssh.withSession(ssh, async (session) => {
      if (input.containerName?.trim()) {
        await session.exec(
          `docker rm -f ${shellQuote(input.containerName.trim())} >/dev/null 2>&1 || true`,
          120_000,
        );
      }
      if (input.deployPath?.trim()) {
        await session.exec(`rm -rf ${shellQuote(input.deployPath.trim())}`);
      }
    });

    if (input.deployDomain?.trim()) {
      try {
        await this.apacheProxy.clearReverseProxy(input.server, input.deployDomain.trim());
      } catch {
        // Best-effort — Plesk site may already be gone
      }
    }
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
