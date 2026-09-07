import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DeployStack, HostingAccount, HostingServer } from "@prisma/client";

import {
  buildApacheProxyDirectives,
  buildPleskApacheReloadCommand,
  pleskVhostConfPath,
  pleskVhostSslConfPath,
} from "../utils/apache-proxy.util";
import { formatDeployBuildError, sanitizeDeployEnvVars } from "../utils/deploy-env.util";
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
        const cloneTarget = input.cloneUrl ?? input.repoUrl;
        const repoExists =
          (await session.exec(`test -d ${shellQuote(`${repoPath}/.git`)}`)).code === 0;

        // Always reuse an existing checkout (including after a failed first deploy).
        // Only full-clone when the folder is missing — never wipe+reclone on every retry.
        const pullExistingRepo = async () => {
          // Force-clean so fetch/checkout is not blocked by leftover local files.
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
        };

        const cloneFreshRepo = async () => {
          await session.execChecked(`rm -rf ${shellQuote(repoPath)}`);
          const cloneCmd = [
            `git clone --depth 1 --branch ${shellQuote(input.branch)}`,
            `${shellQuote(cloneTarget)} ${shellQuote(repoPath)}`,
          ].join(" ");
          await append("git clone", await session.execChecked(cloneCmd, 600_000));
        };

        if (repoExists) {
          await append(
            "prepare",
            `${isRedeploy ? "Redeploy" : "Retry"} — reusing existing repo at ${deployPath}`,
          );
          try {
            await pullExistingRepo();
          } catch (error) {
            if (isGitAuthFailure(error)) {
              throw new Error(formatGitRemoteError(error, "git pull"));
            }
            // Corrupt / broken checkout — one fresh clone, then continue.
            await append("git", "Existing repo update failed — cloning fresh once…");
            try {
              await cloneFreshRepo();
            } catch (cloneError) {
              throw new Error(formatGitRemoteError(cloneError, "git clone"));
            }
          }
        } else {
          await append("prepare", `Deploy path: ${deployPath}`);
          try {
            await cloneFreshRepo();
          } catch (error) {
            throw new Error(formatGitRemoteError(error, "git clone"));
          }
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

        const { env: safeEnv, ignoredPort } = sanitizeDeployEnvVars(
          input.envVars,
          input.containerPort,
        );
        if (ignoredPort != null) {
          await append(
            "env",
            `Ignored customer PORT=${ignoredPort}. Using managed PORT=${input.containerPort} (host publish ${input.hostPort}).`,
          );
        } else {
          await append(
            "env",
            `Using managed PORT=${input.containerPort} (host publish 127.0.0.1:${input.hostPort}).`,
          );
        }

        const envLines = Object.entries(safeEnv)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");
        const envContent = `${envLines}\n`;
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

        // Quiet podman "Emulate Docker CLI" notice when present.
        await session.exec(
          `mkdir -p /etc/containers >/dev/null 2>&1; touch /etc/containers/nodocker >/dev/null 2>&1 || true`,
        );

        // Free dangling layers before build so redeploys don't pile up unused images.
        const prePrune = await session.exec(
          [
            `docker image prune -f >/tmp/vx-prune-pre.txt 2>&1 || true`,
            `docker builder prune -f >/tmp/vx-prune-pre-builder.txt 2>&1 || true`,
            `cat /tmp/vx-prune-pre.txt /tmp/vx-prune-pre-builder.txt 2>/dev/null | tail -n 20`,
          ].join("; "),
          300_000,
        );
        if (prePrune.stdout.trim()) {
          await append("docker prune (before)", prePrune.stdout);
        }

        const buildCmd = [
          `docker build`,
          `-f ${shellQuote(dockerfilePath)}`,
          `-t ${shellQuote(containerName)}`,
          shellQuote(dockerContextDir),
        ].join(" ");
        try {
          await append("docker build", await session.execChecked(buildCmd, 900_000));
        } catch (error) {
          throw new Error(formatDeployBuildError(error));
        }

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

        // Drop dangling intermediates from this build; keep the tagged running image.
        const postPrune = await session.exec(
          [
            `docker image prune -f >/tmp/vx-prune-post.txt 2>&1 || true`,
            `docker builder prune -f >/tmp/vx-prune-post-builder.txt 2>&1 || true`,
            `cat /tmp/vx-prune-post.txt /tmp/vx-prune-post-builder.txt 2>/dev/null | tail -n 20`,
          ].join("; "),
          300_000,
        );
        if (postPrune.stdout.trim()) {
          await append("docker prune (after)", postPrune.stdout);
        }

        await append(
          "ports",
          `App container PORT=${input.containerPort}; reverse proxy target 127.0.0.1:${input.hostPort}. Customer PORT in .env is ignored.`,
        );
      },
      1_800_000,
    );

    // Always (re)apply proxy so host-port switches after conflict are reflected.
    await this.apacheProxy.applyReverseProxy(input.server, input.deployDomain, input.hostPort);
    await append(
      "apache proxy",
      `Reverse proxy configured for ${input.deployDomain} → 127.0.0.1:${input.hostPort}`,
    );

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
    const { env: safeEnv } = sanitizeDeployEnvVars(input.envVars, input.containerPort);
    const envLines = Object.entries(safeEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const envContent = `${envLines}\n`;
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
        const name = input.containerName.trim();
        await session.exec(`docker rm -f ${shellQuote(name)} >/dev/null 2>&1 || true`, 120_000);
        // Remove the tagged image for this project so redeploys don't leave duplicates.
        await session.exec(`docker rmi -f ${shellQuote(name)} >/dev/null 2>&1 || true`, 120_000);
      }
      if (input.deployPath?.trim()) {
        await session.exec(`rm -rf ${shellQuote(input.deployPath.trim())}`);
      }
      await session.exec(
        `docker image prune -f >/dev/null 2>&1 || true; docker builder prune -f >/dev/null 2>&1 || true`,
        300_000,
      );
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

function formatGitRemoteError(error: unknown, action: string): string {
  const raw = (error instanceof Error ? error.message : String(error))
    // Never leak GitHub tokens that may appear in clone URLs inside stderr.
    .replace(/x-access-token:[^@\s]+@/gi, "x-access-token:***@")
    .replace(/\/\/[^:@\s/]+:[^@\s/]+@/g, "//***:***@");
  const lower = raw.toLowerCase();
  if (isGitAuthFailureMessage(lower)) {
    return `${action} failed: GitHub authentication failed. Reconnect GitHub in the deploy panel or use a repo URL the server can access.`;
  }
  if (lower.includes("not found") || lower.includes("repository not found")) {
    return `${action} failed: repository not found or private — check the repo name and GitHub access.`;
  }
  return `${action} failed: ${raw}`;
}

function isGitAuthFailure(error: unknown): boolean {
  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return isGitAuthFailureMessage(raw);
}

function isGitAuthFailureMessage(lower: string): boolean {
  return (
    lower.includes("authentication failed") ||
    lower.includes("invalid username or password") ||
    lower.includes("could not read username") ||
    lower.includes(" 403 ") ||
    lower.includes("status 403") ||
    lower.includes("support for password authentication was removed")
  );
}
