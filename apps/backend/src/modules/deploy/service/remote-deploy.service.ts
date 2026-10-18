import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  DeployRuntime,
  DeploySource,
  DeployStack,
  HostingAccount,
  HostingServer,
} from "@prisma/client";

import {
  buildApacheProxyDirectives,
  buildPleskApacheReloadCommand,
  pleskVhostConfPath,
  pleskVhostSslConfPath,
} from "../utils/apache-proxy.util";
import {
  buildContainerReadinessCommand,
  buildManagedContainerRunCommand,
  parseDockerPublishedPort,
} from "../utils/container-rollout.util";
import {
  formatDeployBuildError,
  redactSshTargets,
  sanitizeDeployEnvVars,
} from "../utils/deploy-env.util";
import { buildDeployLinuxUser, runAsDeployUser } from "../utils/deploy-user.util";
import { dockerRegistryHost, splitRegistryAuth } from "../utils/docker-image.util";
import { buildDockerComposeProjectName, sanitizeAppSubdir } from "../utils/docker-templates.util";
import { resolveHostingServerSshOptions } from "../utils/server-ssh.util";
import {
  buildTenantPrepareCommand,
  buildTenantRunCommand,
  buildTenantMetricsCommand,
  parseTenantMetrics,
  tenantIdentity,
  tenantRuntimeServiceContent,
  tenantRuntimeUnit,
  tenantSliceContent,
  TENANT_PARENT_SLICE,
  type TenantLimits,
} from "../utils/tenant-resources.util";

import { SshService, type SshConnectionOptions, type SshSession } from "./ssh.service";

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

  async activateRelease(input: {
    session: SshSession;
    containerName: string;
    image: string;
    accountId: string;
    envFile: string;
    hostPort: number;
    containerPort: number;
    bindHost?: "127.0.0.1" | "0.0.0.0";
    append: (label: string, output: string) => Promise<void>;
    resourceLimits?: TenantLimits;
    cgroupParent?: string;
    dataPath?: string;
    linuxUser?: string;
    switchTraffic?: (hostPort: number) => Promise<void>;
  }): Promise<void> {
    const candidateName = `${input.containerName}-candidate`;
    const rollbackName = `${input.containerName}-rollback`;

    await input.session.exec(
      `docker rm -f ${shellQuote(candidateName)} >/dev/null 2>&1 || true`,
      60_000,
    );
    await input.append(
      "preflight",
      `Starting candidate ${candidateName} on a temporary loopback port…`,
    );

    try {
      const candidateRun = buildManagedContainerRunCommand({
        name: candidateName,
        image: input.image,
        accountId: input.accountId,
        envFile: input.envFile,
        containerPort: input.containerPort,
        candidate: true,
        bindHost: input.bindHost,
        limits: input.resourceLimits,
        cgroupParent: input.cgroupParent,
        dataPath: input.dataPath,
        linuxUser: input.linuxUser,
      });
      await input.session.execChecked(candidateRun, 120_000);
      const readiness = await input.session.exec(
        buildContainerReadinessCommand({
          name: candidateName,
          containerPort: input.containerPort,
        }),
        120_000,
      );
      if (readiness.code !== 0) {
        throw new Error(
          `Candidate failed readiness check:\n${readiness.stdout}\n${readiness.stderr}`.trim(),
        );
      }
      await input.append("preflight", readiness.stdout.trim() || "Candidate is ready");
    } catch (error) {
      await input.session.exec(
        `docker rm -f ${shellQuote(candidateName)} >/dev/null 2>&1 || true`,
        60_000,
      );
      throw error;
    }

    const candidatePort = parseDockerPublishedPort(
      await input.session.execChecked(
        `docker port ${shellQuote(candidateName)} ${input.containerPort}/tcp | tail -n 1`,
        30_000,
      ),
    );

    const currentInspect = await input.session.exec(
      `docker ps -a --filter name=^/${input.containerName}$ --format '{{.Names}}'`,
    );
    let hasPrevious = currentInspect.stdout.trim() === input.containerName;

    if (!hasPrevious) {
      const rollbackInspect = await input.session.exec(
        `docker ps -a --filter name=^/${rollbackName}$ --format '{{.Names}}'`,
      );
      if (rollbackInspect.stdout.trim() === rollbackName) {
        await input.session.execChecked(
          `docker rename ${shellQuote(rollbackName)} ${shellQuote(input.containerName)}`,
          60_000,
        );
        await input.session.execChecked(`docker start ${shellQuote(input.containerName)}`, 120_000);
        hasPrevious = true;
        await input.append("recovery", "Recovered a previous rollback container before rollout.");
      }
    }

    if (hasPrevious) {
      await input.switchTraffic?.(candidatePort);
      await input.append(
        "traffic switch",
        `Reverse proxy moved to healthy candidate on port ${candidatePort}.`,
      );
      await input.session.exec(
        `docker rm -f ${shellQuote(rollbackName)} >/dev/null 2>&1 || true`,
        60_000,
      );
      await input.session.execChecked(`docker stop ${shellQuote(input.containerName)}`, 120_000);
      await input.session.execChecked(
        `docker rename ${shellQuote(input.containerName)} ${shellQuote(rollbackName)}`,
        60_000,
      );
    }

    try {
      const liveRun = buildManagedContainerRunCommand({
        name: input.containerName,
        image: input.image,
        accountId: input.accountId,
        envFile: input.envFile,
        containerPort: input.containerPort,
        hostPort: input.hostPort,
        bindHost: input.bindHost,
        limits: input.resourceLimits,
        cgroupParent: input.cgroupParent,
        dataPath: input.dataPath,
        linuxUser: input.linuxUser,
      });
      await input.session.execChecked(liveRun, 120_000);
      const readiness = await input.session.exec(
        buildContainerReadinessCommand({
          name: input.containerName,
          containerPort: input.containerPort,
          hostPort: input.hostPort,
          attempts: 20,
        }),
        90_000,
      );
      if (readiness.code !== 0) {
        throw new Error(
          `Live container failed readiness check:\n${readiness.stdout}\n${readiness.stderr}`.trim(),
        );
      }
      await input.append("readiness", readiness.stdout.trim() || "Live container is ready");
      await input.switchTraffic?.(input.hostPort);
      await input.append("traffic switch", `Reverse proxy moved to live port ${input.hostPort}.`);
      if (hasPrevious) {
        await input.session.exec(
          `docker rm -f ${shellQuote(rollbackName)} >/dev/null 2>&1 || true`,
          60_000,
        );
      }
    } catch (error) {
      await input.session.exec(
        `docker rm -f ${shellQuote(input.containerName)} >/dev/null 2>&1 || true`,
        60_000,
      );
      if (hasPrevious) {
        await input.session.execChecked(
          `docker rename ${shellQuote(rollbackName)} ${shellQuote(input.containerName)}`,
          60_000,
        );
        await input.session.execChecked(`docker start ${shellQuote(input.containerName)}`, 120_000);
        await input.switchTraffic?.(input.hostPort);
        await input.append(
          "rollback",
          "New release failed readiness; previous container was restored automatically.",
        );
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        hasPrevious
          ? `New release failed; previous release restored. ${reason}`
          : `New release failed readiness. ${reason}`,
      );
    } finally {
      await input.session.exec(
        `docker rm -f ${shellQuote(candidateName)} >/dev/null 2>&1 || true`,
        60_000,
      );
    }
  }

  buildSshOptions(server: HostingServer): SshConnectionOptions {
    const cfg = this.deployConfig;
    const options = resolveHostingServerSshOptions(server, cfg.sshPort);
    if (cfg.sshUser) {
      return { ...options, username: cfg.sshUser };
    }
    return options;
  }

  async applyReverseProxy(
    server: HostingServer,
    domain: string,
    hostPort: number,
    targetHost = "127.0.0.1",
  ): Promise<void> {
    const ssh = this.buildSshOptions(server);
    const directives = buildApacheProxyDirectives(hostPort, targetHost);
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

type TenantResourceSample = ReturnType<typeof parseTenantMetrics> & {
  cpuPercent: number | null;
  mock: boolean;
  checkedAt: string;
};

@Injectable()
export class RemoteDeployService {
  private readonly resourceSamples = new Map<
    string,
    {
      at: number;
      cpu: number | null;
      uptime: number | null;
      result: ReturnType<typeof parseTenantMetrics> & {
        cpuPercent: number | null;
        mock: boolean;
        checkedAt: string;
      };
    }
  >();
  private readonly resourceInFlight = new Map<string, Promise<TenantResourceSample>>();
  constructor(
    private readonly ssh: SshService,
    private readonly apacheProxy: ApacheProxyService,
    private readonly configService: ConfigService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  async probeResources(server: HostingServer, accountId: string): Promise<TenantResourceSample> {
    const key = `${server.id}:${accountId}`;
    const previous = this.resourceSamples.get(key);
    if (previous && Date.now() - previous.at < 15_000) return previous.result;
    const inFlight = this.resourceInFlight.get(key);
    if (inFlight) return inFlight;
    const request = (async () => {
      const mock = this.deployConfig.mockRemote;
      const output = mock
        ? "VX_READY=0"
        : await this.ssh.execChecked(
            this.apacheProxy.buildSshOptions(server),
            buildTenantMetricsCommand(accountId, this.deployConfig.basePath.replace(/\/$/, "")),
            30_000,
          );
      const metrics = parseTenantMetrics(output);
      const elapsed =
        metrics.uptimeSeconds != null && previous?.uptime != null
          ? metrics.uptimeSeconds - previous.uptime
          : 0;
      const cpuPercent =
        metrics.cpuUsec != null &&
        previous?.cpu != null &&
        metrics.cpuUsec >= previous.cpu &&
        elapsed > 0
          ? Math.round(((metrics.cpuUsec - previous.cpu) / (elapsed * 1_000_000)) * 1000) / 10
          : null;
      const result = { ...metrics, cpuPercent, mock, checkedAt: new Date().toISOString() };
      if (this.resourceSamples.size > 1000)
        this.resourceSamples.delete(this.resourceSamples.keys().next().value!);
      this.resourceSamples.set(key, {
        at: Date.now(),
        cpu: metrics.cpuUsec,
        uptime: metrics.uptimeSeconds,
        result,
      });
      return result;
    })();
    this.resourceInFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.resourceInFlight.delete(key);
    }
  }

  private async ensurePm2Runtime(
    session: SshSession,
    append: (label: string, output: string) => Promise<void>,
  ): Promise<void> {
    const probe = await session.exec(
      `command -v git >/dev/null 2>&1 && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && command -v pm2 >/dev/null 2>&1 && test "$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)" -ge 22`,
      30_000,
    );
    if (probe.code === 0) {
      const versions = await session.execChecked(
        `printf 'node '; node --version; printf 'npm '; npm --version; printf 'pm2 '; pm2 --version`,
        30_000,
      );
      await append("PM2 runtime", versions);
      return;
    }

    await append("PM2 runtime", "Installing Node.js 22, Git, unzip and PM2…");
    const install = [
      `set -e`,
      `if command -v apt-get >/dev/null 2>&1; then`,
      `  export DEBIAN_FRONTEND=noninteractive`,
      `  apt-get update -qq`,
      `  apt-get install -y -qq git curl unzip ca-certificates`,
      `  NODE_MAJOR=0; command -v node >/dev/null 2>&1 && NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)`,
      `  if [ "$NODE_MAJOR" -lt 22 ]; then`,
      `    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -`,
      `    apt-get install -y -qq nodejs`,
      `  fi`,
      `else`,
      `  PKG=dnf; command -v dnf >/dev/null 2>&1 || PKG=yum`,
      `  $PKG -y install git curl unzip ca-certificates`,
      `  NODE_MAJOR=0; command -v node >/dev/null 2>&1 && NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)`,
      `  if [ "$NODE_MAJOR" -lt 22 ]; then`,
      `    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -`,
      `    $PKG -y install nodejs`,
      `  fi`,
      `fi`,
      `npm install -g pm2@latest pnpm@9.15.0 yarn`,
      `PM2_USER="$(id -un)"`,
      `PM2_HOME_DIR="$(getent passwd "$PM2_USER" | cut -d: -f6)"`,
      `pm2 startup systemd -u "$PM2_USER" --hp "$PM2_HOME_DIR" >/dev/null 2>&1 || true`,
      `node --version && npm --version && pm2 --version`,
    ].join("\n");
    await append("PM2 install", await session.execChecked(install, 900_000));
  }

  private async cleanGeneratedSource(
    session: SshSession,
    repoPath: string,
    append: (label: string, output: string) => Promise<void>,
  ): Promise<void> {
    const generatedFind = [
      `find ${shellQuote(repoPath)} -type d`,
      `\\( -name node_modules -o -name .next -o -name .turbo -o -name coverage`,
      `-o -name playwright-report -o -name test-results \\)`,
      `-prune -print 2>/dev/null | head -n 40`,
    ].join(" ");
    const generated = await session.exec(generatedFind, 120_000);
    const paths = generated.stdout
      .split("\n")
      .map((path) => path.trim())
      .filter(Boolean);

    if (paths.length > 0) {
      await append(
        "source cleanup",
        [
          "Generated dependency/build folders were found and removed from the deploy checkout.",
          "Do not upload or commit these folders; dependencies are installed automatically:",
          ...paths.map((path) => `- ${path.replace(`${repoPath}/`, "")}`),
        ].join("\n"),
      );
      const cleanup = [
        `find ${shellQuote(repoPath)} -type d`,
        `\\( -name node_modules -o -name .next -o -name .turbo -o -name coverage`,
        `-o -name playwright-report -o -name test-results \\)`,
        `-prune -exec rm -rf -- {} +`,
      ].join(" ");
      await session.execChecked(cleanup, 300_000);
    }

    const largeFiles = await session.exec(
      `find ${shellQuote(repoPath)} -type f -size +100M -print 2>/dev/null | head -n 20`,
      120_000,
    );
    if (largeFiles.stdout.trim()) {
      await append(
        "large files",
        `Files larger than 100 MB count toward the hosting quota:\n${largeFiles.stdout.trim()}`,
      );
    }
  }

  private async scanSourceSecurity(
    session: SshSession,
    repoPath: string,
    append: (label: string, output: string) => Promise<void>,
    wrap: (command: string) => string = (command) => command,
  ): Promise<void> {
    const scan = [
      `LINK_PATH="$(find ${shellQuote(repoPath)} -type l -print -quit 2>/dev/null || true)"`,
      `if [ -n "$LINK_PATH" ]; then echo "Symbolic links are not allowed: $LINK_PATH" >&2; exit 51; fi`,
      `SUSPICIOUS="$(find ${shellQuote(repoPath)} -name package.json -not -path '*/node_modules/*' -type f -exec grep -EHin '(curl|wget).{0,120}[|].*(sh|bash)|(/etc/passwd|/etc/shadow)|(^|[^a-z])(nc|ncat|socat)[[:space:]].*(-e|exec)|xmrig|minerd|chmod[[:space:]]+[ugo]*[+]s' {} + 2>/dev/null | head -n 20 || true)"`,
      `if [ -n "$SUSPICIOUS" ]; then echo "Blocked suspicious dependency lifecycle script:" >&2; echo "$SUSPICIOUS" >&2; exit 52; fi`,
      `KEY_FILE="$(find ${shellQuote(repoPath)} -type f \\( -name '*.pem' -o -name 'id_rsa' -o -name 'id_ed25519' -o -name '.env' \\) -print -quit 2>/dev/null || true)"`,
      `if [ -n "$KEY_FILE" ]; then echo "Warning: secret-like file found in source: $KEY_FILE"; fi`,
      `echo 'Source security scan passed (no symlinks or known malicious lifecycle patterns).'`,
    ].join("\n");
    const result = await session.exec(wrap(scan), 120_000);
    if (result.code !== 0) {
      throw new BadRequestException(
        `${result.stderr || result.stdout || "Source security scan failed"}`.trim(),
      );
    }
    await append("security scan", result.stdout.trim());
  }

  private async enforceDiskQuota(input: {
    session: SshSession;
    accountId: string;
    diskLimitBytes: number;
    image?: string;
    append: (label: string, output: string) => Promise<void>;
  }): Promise<void> {
    const accountRoot = this.resolveDeployPath(input.accountId, "").replace(/\/$/, "");
    const imageProbe = input.image
      ? `IMAGE_BYTES="$(docker image inspect ${shellQuote(input.image)} --format '{{.Size}}' 2>/dev/null || echo 0)"`
      : `IMAGE_BYTES=0`;
    const probe = await input.session.exec(
      [
        `ACCOUNT_BYTES="$(du -sb ${shellQuote(accountRoot)} 2>/dev/null | awk '{print $1}' || echo 0)"`,
        imageProbe,
        `AVAILABLE_BYTES="$(df -PB1 ${shellQuote(accountRoot)} 2>/dev/null | awk 'NR==2 {print $4}' || echo 0)"`,
        `echo "VX_ACCOUNT_BYTES=$ACCOUNT_BYTES"`,
        `echo "VX_IMAGE_BYTES=$IMAGE_BYTES"`,
        `echo "VX_AVAILABLE_BYTES=$AVAILABLE_BYTES"`,
      ].join("; "),
      120_000,
    );

    const read = (key: string) => {
      const match = probe.stdout.match(new RegExp(`^${key}=(\\d+)$`, "m"));
      return match ? Number.parseInt(match[1]!, 10) : 0;
    };
    const accountBytes = read("VX_ACCOUNT_BYTES");
    const imageBytes = read("VX_IMAGE_BYTES");
    const availableBytes = read("VX_AVAILABLE_BYTES");
    const estimatedBytes = accountBytes;

    await input.append(
      "disk quota",
      `Workspace usage ${formatBytes(estimatedBytes)} / plan limit ${formatBytes(input.diskLimitBytes)}${input.image ? `; shared read-only image ${formatBytes(imageBytes)} is managed separately by the server` : ""}.`,
    );

    if (estimatedBytes > input.diskLimitBytes) {
      throw new BadRequestException(
        `Hosting disk limit exceeded: deploy needs about ${formatBytes(estimatedBytes)}, but this plan allows ${formatBytes(input.diskLimitBytes)}. Remove node_modules, .next, dist, logs and large files, or upgrade the hosting plan. Dependencies are installed automatically.`,
      );
    }
    if (availableBytes > 0 && availableBytes < 512 * 1024 * 1024) {
      throw new BadRequestException(
        `Hosting server has only ${formatBytes(availableBytes)} free. At least 512 MB is required before deploy.`,
      );
    }
  }

  resolveDeployPath(accountId: string, projectName: string): string {
    const base = this.deployConfig.basePath.replace(/\/$/, "");
    return `${base}/${accountId}/${projectName}`;
  }

  private async readAccountDiskUsageMb(session: SshSession, accountId: string): Promise<number> {
    const accountRoot = this.resolveDeployPath(accountId, "").replace(/\/$/, "");
    const result = await session.exec(
      `du -sm ${shellQuote(accountRoot)} 2>/dev/null | awk '{print $1}' || echo 0`,
      120_000,
    );
    const value = Number.parseInt(result.stdout.trim(), 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  async deployApplication(input: {
    server: HostingServer;
    proxyServer: HostingServer;
    proxyTargetHost: string;
    account: HostingAccount;
    projectName: string;
    stack: DeployStack;
    source: DeploySource;
    runtime: DeployRuntime;
    imageRef?: string | null;
    sourceArchivePath?: string | null;
    repoUrl: string;
    cloneUrl?: string;
    branch: string;
    rootDirectory?: string | null;
    hostPort: number;
    containerPort: number;
    diskLimitBytes: number;
    envVars: Record<string, string>;
    resourceLimits: TenantLimits;
    deployDomain: string;
    existingDeployPath?: string | null;
    existingContainerName?: string | null;
    onLog?: (chunk: string) => void | Promise<void>;
    onStage?: (stage: "cloning_repo" | "building" | "starting") => void | Promise<void>;
    abortSignal?: AbortSignal;
  }): Promise<{ deployPath: string; containerName: string; diskUsedMb: number; log: string }> {
    const cfg = this.deployConfig;
    if (input.runtime === "DOCKER" && input.source !== "DOCKER_IMAGE") {
      throw new BadRequestException("Docker runtime is available only for .NET image deploys");
    }
    if (input.runtime === "PM2" && input.source === "DOCKER_IMAGE") {
      throw new BadRequestException("Docker image deploys require the Docker runtime");
    }
    if (cfg.mockRemote) {
      const deployPath = this.resolveDeployPath(input.account.id, input.projectName);
      return {
        deployPath,
        containerName: `mock-${input.projectName}`,
        diskUsedMb: 0,
        log: "[mock] Skipped remote runtime — DEPLOY_MOCK_REMOTE=true\n",
      };
    }

    const ssh = this.apacheProxy.buildSshOptions(input.server);
    const isRemoteProxy = input.server.id !== input.proxyServer.id;
    const bindHost: "127.0.0.1" | "0.0.0.0" = isRemoteProxy ? "0.0.0.0" : "127.0.0.1";
    const deployPath =
      input.existingDeployPath?.trim() ||
      this.resolveDeployPath(input.account.id, input.projectName);
    const containerName =
      input.existingContainerName?.trim() ||
      buildDockerComposeProjectName(input.account.id, input.projectName);
    const isRedeploy = Boolean(input.existingDeployPath && input.existingContainerName);
    const deployUser = buildDeployLinuxUser(input.account.id);
    const tenant = tenantIdentity(input.account.id, cfg.basePath.replace(/\/$/, ""));
    const bounded = (command: string) =>
      buildTenantRunCommand({
        accountId: input.account.id,
        basePath: cfg.basePath.replace(/\/$/, ""),
        command,
      });
    const logs: string[] = [];
    let diskUsedMb = 0;

    const append = async (label: string, output: string) => {
      const chunk = redactSshTargets(`\n--- ${label} ---\n${output.trim()}\n`);
      logs.push(chunk);
      if (input.onLog) await input.onLog(chunk);
    };

    let streamBuf = "";
    let streamFlush: Promise<void> = Promise.resolve();
    let streamTimer: ReturnType<typeof setTimeout> | null = null;

    const flushBuildStream = async () => {
      if (!streamBuf) return;
      const text = redactSshTargets(streamBuf);
      streamBuf = "";
      if (!text) return;
      logs.push(text);
      if (input.onLog) await input.onLog(text);
    };

    const queueBuildStream = (chunk: string) => {
      streamBuf += chunk;
      const flushSoon = () => {
        if (streamTimer) {
          clearTimeout(streamTimer);
          streamTimer = null;
        }
        streamFlush = streamFlush.then(() => flushBuildStream());
      };
      if (streamBuf.length >= 1800) flushSoon();
      else if (!streamTimer) streamTimer = setTimeout(flushSoon, 1000);
    };

    const finishBuildStream = async () => {
      if (streamTimer) {
        clearTimeout(streamTimer);
        streamTimer = null;
      }
      await streamFlush;
      await flushBuildStream();
    };

    await this.ssh.withSession(
      ssh,
      async (session) => {
        await append("server", `Connected to hosting server`);

        if ((await session.exec("test -f /etc/systemd/system/vexira.slice")).code !== 0)
          await session.writeFile("/etc/systemd/system/vexira.slice", TENANT_PARENT_SLICE);
        await session.writeFile(
          `/etc/systemd/system/${tenant.slice}`,
          tenantSliceContent(input.resourceLimits),
        );
        await append(
          "resource isolation",
          await session.execChecked(
            buildTenantPrepareCommand(
              input.account.id,
              cfg.basePath.replace(/\/$/, ""),
              input.resourceLimits,
            ),
            120_000,
          ),
        );
        // Lock managed files' parent against tenant-created symlinks before any root writes.
        await session.execChecked(
          [
            `test ! -L ${shellQuote(deployPath)}`,
            `mkdir -p ${shellQuote(deployPath)}`,
            `chown root:${deployUser} ${shellQuote(deployPath)} && chmod 750 ${shellQuote(deployPath)}`,
            `test ! -L ${shellQuote(`${deployPath}/repo`)} && test ! -L ${shellQuote(`${deployPath}/repo-extract`)}`,
            `install -d -o ${deployUser} -g ${deployUser} -m 700 ${shellQuote(`${deployPath}/repo`)} ${shellQuote(`${deployPath}/repo-extract`)}`,
            `rm -f -- ${shellQuote(`${deployPath}/.env`)} ${shellQuote(`${deployPath}/pm2-env.json`)} ${shellQuote(`${deployPath}/ecosystem.config.cjs`)} ${shellQuote(`${deployPath}/source.zip`)}`,
          ].join(" && "),
        );

        if (input.runtime === "PM2") {
          await this.ensurePm2Runtime(session, append);
        }

        if (input.runtime === "DOCKER") {
          const imageRef = input.imageRef?.trim();
          if (!imageRef) {
            throw new BadRequestException("Docker image is required");
          }

          const { env: rawEnv, ignoredPort } = sanitizeDeployEnvVars(
            input.envVars,
            input.containerPort,
          );
          const { appEnv, registryUser, registryPassword, registryHost } =
            splitRegistryAuth(rawEnv);
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

          const envLines = Object.entries(appEnv)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");
          await session.writeFile(`${deployPath}/.env`, `${envLines}\n`);
          await session.execChecked(`chmod 600 ${shellQuote(`${deployPath}/.env`)}`);

          if (registryUser && registryPassword) {
            const host = registryHost || dockerRegistryHost(imageRef);
            await append("docker login", `Logging in to ${host}…`);
            const loginCmd = [
              `printf '%s' ${shellQuote(registryPassword)}`,
              `| docker login --username ${shellQuote(registryUser)} --password-stdin ${shellQuote(host)}`,
            ].join(" ");
            try {
              await session.execChecked(loginCmd, 120_000);
            } catch (error) {
              throw new Error(formatDeployBuildError(error));
            }
          }

          await input.onStage?.("building");
          await append("docker pull", `Pulling ${imageRef} onto the hosting server…`);
          try {
            await session.execChecked(`docker pull ${shellQuote(imageRef)}`, 900_000, (chunk) =>
              queueBuildStream(chunk),
            );
            await finishBuildStream();
          } catch (error) {
            await finishBuildStream();
            throw new Error(formatDeployBuildError(error));
          }

          await session.execChecked(
            `docker tag ${shellQuote(imageRef)} ${shellQuote(containerName)}`,
            60_000,
          );
          await this.enforceDiskQuota({
            session,
            accountId: input.account.id,
            diskLimitBytes: input.diskLimitBytes,
            image: containerName,
            append,
          });

          await input.onStage?.("starting");
          await session.execChecked(
            `test ! -L ${shellQuote(`${deployPath}/data`)} && install -d -o ${deployUser} -g ${deployUser} -m 700 ${shellQuote(`${deployPath}/data`)}`,
          );
          const driver = await session.execChecked(
            "docker info --format '{{.CgroupDriver}}'",
            30_000,
          );
          if (driver.trim() !== "systemd")
            throw new BadRequestException(
              "Docker must use the systemd cgroup driver for aggregate tenant limits",
            );
          await this.apacheProxy.activateRelease({
            session,
            containerName,
            image: containerName,
            accountId: input.account.id,
            envFile: `${deployPath}/.env`,
            hostPort: input.hostPort,
            containerPort: input.containerPort,
            bindHost,
            append,
            resourceLimits: input.resourceLimits,
            cgroupParent: tenant.slice,
            dataPath: `${deployPath}/data`,
            linuxUser: deployUser,
            switchTraffic: async (port) =>
              this.apacheProxy.applyReverseProxy(
                input.proxyServer,
                input.deployDomain,
                port,
                input.proxyTargetHost,
              ),
          });

          await append(
            "ports",
            `App container PORT=${input.containerPort}; reverse proxy target ${input.proxyTargetHost}:${input.hostPort}.`,
          );

          const postPrune = await session.exec(
            `docker image prune -f 2>&1 | tail -n 8 || true`,
            120_000,
          );
          if (postPrune.stdout.trim() || postPrune.stderr.trim()) {
            await append("docker prune (after)", `${postPrune.stdout}\n${postPrune.stderr}`);
          }
          diskUsedMb = await this.readAccountDiskUsageMb(session, input.account.id);
          return;
        }

        await input.onStage?.("cloning_repo");

        const repoPath = `${deployPath}/repo`;
        const isUpload = input.source === "UPLOAD";
        const cloneTarget = input.cloneUrl ?? input.repoUrl;
        const repoExists =
          !isUpload && (await session.exec(`test -d ${shellQuote(`${repoPath}/.git`)}`)).code === 0;

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
          await append("git pull", await session.execChecked(bounded(updateCmd), 600_000));
        };

        const cloneFreshRepo = async () => {
          await session.execChecked(
            bounded(`find ${shellQuote(repoPath)} -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +`),
          );
          const cloneCmd = [
            `git clone --depth 1 --branch ${shellQuote(input.branch)}`,
            `${shellQuote(cloneTarget)} ${shellQuote(repoPath)}`,
          ].join(" ");
          await append("git clone", await session.execChecked(bounded(cloneCmd), 600_000));
        };

        if (isUpload) {
          const sourceArchivePath = input.sourceArchivePath?.trim();
          if (!sourceArchivePath) {
            throw new BadRequestException(
              "ZIP source archive is missing; upload the project again",
            );
          }
          const remoteArchive = `${deployPath}/source.zip`;
          const extractPath = `${deployPath}/repo-extract`;
          await append("source upload", "Uploading ZIP source archive to the hosting server…");
          await session.uploadFile(sourceArchivePath, remoteArchive);
          await session.execChecked(
            `chown root:${deployUser} ${shellQuote(remoteArchive)} && chmod 640 ${shellQuote(remoteArchive)}`,
          );
          const extractCommand = [
            `if unzip -Z1 ${shellQuote(remoteArchive)} | grep -E '(^/|(^|/)\\.\\.(/|$))' >/dev/null; then echo 'Unsafe ZIP path detected' >&2; exit 41; fi`,
            `ENTRY_COUNT="$(unzip -Z1 ${shellQuote(remoteArchive)} | wc -l)"`,
            `if [ "$ENTRY_COUNT" -gt 20000 ]; then echo 'ZIP contains more than 20000 entries' >&2; exit 42; fi`,
            `UNPACKED_BYTES="$(unzip -l ${shellQuote(remoteArchive)} | tail -n 1 | awk '{print $1}')"`,
            `case "$UNPACKED_BYTES" in ''|*[!0-9]*) echo 'Cannot determine ZIP unpacked size' >&2; exit 43;; esac`,
            `if [ "$UNPACKED_BYTES" -gt ${input.diskLimitBytes} ]; then echo 'ZIP unpacked size exceeds hosting disk quota' >&2; exit 44; fi`,
            `find ${shellQuote(repoPath)} ${shellQuote(extractPath)} -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +`,
            `unzip -q ${shellQuote(remoteArchive)} -d ${shellQuote(extractPath)}`,
            `TOP_COUNT="$(find ${shellQuote(extractPath)} -mindepth 1 -maxdepth 1 | wc -l)"`,
            `TOP_PATH="$(find ${shellQuote(extractPath)} -mindepth 1 -maxdepth 1 | head -n 1)"`,
            `if [ "$TOP_COUNT" = 1 ] && [ -d "$TOP_PATH" ]; then cp -a "$TOP_PATH"/. ${shellQuote(repoPath)}/; else cp -a ${shellQuote(extractPath)}/. ${shellQuote(repoPath)}/; fi`,
            `find ${shellQuote(extractPath)} -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +`,
          ].join(" && ");
          try {
            await append(
              "source extract",
              await session.execChecked(bounded(extractCommand), 600_000),
            );
            await session.execChecked(`rm -f -- ${shellQuote(remoteArchive)}`);
          } catch (error) {
            await session.exec(
              `rm -rf ${shellQuote(extractPath)} ${shellQuote(remoteArchive)} >/dev/null 2>&1 || true`,
              120_000,
            );
            throw new Error(formatDeployBuildError(error));
          }
        } else if (repoExists) {
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

        // Cleanup is also unprivileged, not a root shell walking customer files.
        await session.execChecked(
          bounded(
            `find ${shellQuote(repoPath)} -type d \\( -name node_modules -o -name .next -o -name .turbo -o -name coverage \\) -prune -exec rm -rf -- {} +`,
          ),
          300_000,
        );
        await this.scanSourceSecurity(session, repoPath, append, bounded);
        await this.enforceDiskQuota({
          session,
          accountId: input.account.id,
          diskLimitBytes: input.diskLimitBytes,
          append,
        });

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
        const appRoot = monorepo ? repoRoot : rootDirRaw ? `${repoRoot}/${rootDirRaw}` : repoRoot;

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
            `Ignored customer PORT=${ignoredPort}. PM2 uses managed PORT=${input.hostPort}.`,
          );
        } else {
          await append("env", `PM2 uses managed PORT=${input.hostPort}.`);
        }

        const envLines = Object.entries(safeEnv)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");
        const envContent = `${envLines}\n`;
        await session.writeFile(`${deployPath}/.env`, envContent);

        const runtimeRoot = monorepo ? `${repoRoot}/${appSubdir}` : appRoot;
        const installCmd = monorepo
          ? [
              `cd ${shellQuote(repoRoot)}`,
              `pnpm config set store-dir "$HOME/.pnpm-store"`,
              `pnpm install --frozen-lockfile`,
            ].join(" && ")
          : [
              `cd ${shellQuote(runtimeRoot)}`,
              `if [ -f pnpm-lock.yaml ]; then pnpm config set store-dir "$HOME/.pnpm-store" && pnpm install --frozen-lockfile;`,
              `elif [ -f yarn.lock ]; then yarn install --frozen-lockfile;`,
              `elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci;`,
              `else npm install; fi`,
            ].join(" ");

        await input.onStage?.("building");
        await append(
          "dependencies",
          "Installing dependencies on the server. node_modules, .next and dist from uploads are ignored and rebuilt automatically.",
        );
        try {
          await session.execChecked(bounded(installCmd), 900_000, (chunk) =>
            queueBuildStream(chunk),
          );
          await finishBuildStream();
        } catch (error) {
          await finishBuildStream();
          throw new Error(formatDeployBuildError(error));
        }

        const buildCmd = monorepo
          ? `cd ${shellQuote(repoRoot)} && pnpm --filter ${shellQuote(`./${appSubdir}...`)} run build`
          : [
              `cd ${shellQuote(runtimeRoot)}`,
              `if [ -f pnpm-lock.yaml ]; then pnpm run build;`,
              `elif [ -f yarn.lock ]; then yarn run build;`,
              `else npm run build; fi`,
            ].join(" ");
        await append("PM2 build", `Building ${input.stack} application…`);
        try {
          await session.execChecked(bounded(buildCmd), 900_000, (chunk) => queueBuildStream(chunk));
          await finishBuildStream();
        } catch (error) {
          await finishBuildStream();
          throw new Error(formatDeployBuildError(error));
        }

        await this.enforceDiskQuota({
          session,
          accountId: input.account.id,
          diskLimitBytes: input.diskLimitBytes,
          append,
        });

        const envJson = JSON.stringify({
          ...safeEnv,
          NODE_ENV: "production",
          PORT: String(input.hostPort),
          HOST: bindHost,
          HOSTNAME: bindHost,
        });
        const envJsonPath = `${deployPath}/pm2-env.json`;
        const ecosystemPath = `${deployPath}/ecosystem.config.cjs`;
        await session.writeFile(envJsonPath, `${envJson}\n`);
        await session.execChecked(`chmod 600 ${shellQuote(envJsonPath)}`);

        let startArgs = "start";
        if (input.stack === "NESTJS") {
          const scriptProbe = await session.exec(
            bounded(
              `cd ${shellQuote(runtimeRoot)} && node -e "const p=require('./package.json'); process.stdout.write(p.scripts?.['start:prod'] ? 'run start:prod' : 'start')"`,
            ),
            30_000,
          );
          startArgs = scriptProbe.stdout.trim() || "start";
        }
        const ecosystem = `module.exports = { apps: [{ name: ${JSON.stringify(containerName)}, cwd: ${JSON.stringify(runtimeRoot)}, script: "npm", args: ${JSON.stringify(startArgs)}, env: require(${JSON.stringify(envJsonPath)}), autorestart: true, max_restarts: 10, restart_delay: 1500, time: true }] };\n`;
        await session.writeFile(ecosystemPath, ecosystem);
        await session.execChecked(
          `chown root:${deployUser} ${shellQuote(envJsonPath)} ${shellQuote(ecosystemPath)} && chmod 640 ${shellQuote(envJsonPath)} ${shellQuote(ecosystemPath)}`,
        );

        await input.onStage?.("starting");
        await session.exec(`docker rm -f ${shellQuote(containerName)} >/dev/null 2>&1 || true`);
        await append("PM2", `Starting ${containerName} on ${bindHost}:${input.hostPort}…`);
        const runtimeUnit = tenantRuntimeUnit(containerName);
        // Stop a legacy unsandboxed PM2 process before moving it under the managed service.
        await session.exec(
          `if pgrep -u ${shellQuote(deployUser)} -f 'God Daemon' >/dev/null 2>&1; then ${runAsDeployUser(deployUser, `pm2 delete ${shellQuote(containerName)}`)} >/dev/null 2>&1 || true; fi`,
        );
        await session.writeFile(
          `/etc/systemd/system/${runtimeUnit}`,
          tenantRuntimeServiceContent(
            input.account.id,
            cfg.basePath.replace(/\/$/, ""),
            `exec pm2-runtime start ${shellQuote(ecosystemPath)} --only ${shellQuote(containerName)}`,
            containerName,
          ),
        );
        await session.execChecked(
          `systemctl daemon-reload && systemctl enable ${shellQuote(runtimeUnit)} && systemctl restart ${shellQuote(runtimeUnit)}`,
          120_000,
        );
        const readyCmd = [
          `for i in $(seq 1 30); do`,
          `  CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 4 http://127.0.0.1:${input.hostPort}/ 2>/dev/null || true)`,
          `  if [ "$CODE" != "000" ] && [ -n "$CODE" ]; then echo "PM2 app ready (HTTP $CODE)"; exit 0; fi`,
          `  sleep 2`,
          `done`,
          `journalctl -u ${shellQuote(runtimeUnit)} --no-pager -n 60 2>&1 || true`,
          `exit 1`,
        ].join("\n");
        await append("PM2 readiness", await session.execChecked(readyCmd, 90_000));
        await append(
          "ports",
          `PM2 process PORT=${input.hostPort}; reverse proxy target ${input.proxyTargetHost}:${input.hostPort}. Docker is not used for this ${input.stack} app.`,
        );
        diskUsedMb = await this.readAccountDiskUsageMb(session, input.account.id);
      },
      1_800_000,
      input.abortSignal,
    );

    if (input.abortSignal?.aborted) {
      throw new Error("Deploy cancelled");
    }

    // Always (re)apply proxy so host-port switches after conflict are reflected.
    await this.apacheProxy.applyReverseProxy(
      input.proxyServer,
      input.deployDomain,
      input.hostPort,
      input.proxyTargetHost,
    );
    await append(
      "apache proxy",
      `Reverse proxy configured for ${input.deployDomain} → ${input.proxyTargetHost}:${input.hostPort}`,
    );

    return {
      deployPath,
      containerName,
      diskUsedMb,
      log: logs.join("\n"),
    };
  }

  async restartApplication(input: {
    server: HostingServer;
    accountId: string;
    deployPath: string;
    containerName: string;
    runtime: DeployRuntime;
    hostPort: number;
    containerPort: number;
    envVars: Record<string, string>;
    resourceLimits: TenantLimits;
    bindHost?: "127.0.0.1" | "0.0.0.0";
  }): Promise<void> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) return;

    const ssh = this.apacheProxy.buildSshOptions(input.server);
    const basePath = cfg.basePath.replace(/\/$/, "");
    const tenant = tenantIdentity(input.accountId, basePath);
    if ((await this.ssh.exec(ssh, "test -f /etc/systemd/system/vexira.slice")).code !== 0)
      await this.ssh.writeFile(ssh, "/etc/systemd/system/vexira.slice", TENANT_PARENT_SLICE);
    await this.ssh.writeFile(
      ssh,
      `/etc/systemd/system/${tenant.slice}`,
      tenantSliceContent(input.resourceLimits),
    );
    await this.ssh.execChecked(
      ssh,
      buildTenantPrepareCommand(input.accountId, basePath, input.resourceLimits),
      120_000,
    );
    const { env: safeEnv } = sanitizeDeployEnvVars(input.envVars, input.containerPort);
    const envLines = Object.entries(safeEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const envContent = `${envLines}\n`;
    await this.ssh.execChecked(
      ssh,
      `test ! -L ${shellQuote(input.deployPath)} && test "$(stat -c %U ${shellQuote(input.deployPath)})" = root && test ! -L ${shellQuote(`${input.deployPath}/.env`)} && test ! -L ${shellQuote(`${input.deployPath}/pm2-env.json`)} || { echo 'Redeploy this legacy application into the isolated runtime before changing its environment' >&2; exit 67; }`,
    );
    await this.ssh.writeFile(ssh, `${input.deployPath}/.env`, envContent);

    if (input.runtime === "PM2") {
      const deployUser = buildDeployLinuxUser(input.accountId);
      const envJsonPath = `${input.deployPath}/pm2-env.json`;
      await this.ssh.writeFile(
        ssh,
        envJsonPath,
        `${JSON.stringify({ ...safeEnv, NODE_ENV: "production", PORT: String(input.hostPort), HOST: input.bindHost ?? "127.0.0.1", HOSTNAME: input.bindHost ?? "127.0.0.1" })}\n`,
      );
      await this.ssh.execChecked(
        ssh,
        `chown root:${deployUser} ${shellQuote(envJsonPath)} && chmod 640 ${shellQuote(envJsonPath)} && systemctl restart ${shellQuote(tenantRuntimeUnit(input.containerName))}`,
        120_000,
      );
      return;
    }

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

    const runCmd = buildManagedContainerRunCommand({
      name: input.containerName,
      image: input.containerName,
      accountId: input.accountId,
      envFile: `${input.deployPath}/.env`,
      containerPort: input.containerPort,
      hostPort: input.hostPort,
      bindHost: input.bindHost,
      limits: input.resourceLimits,
      cgroupParent: tenant.slice,
      dataPath: `${input.deployPath}/data`,
      linuxUser: tenant.user,
    });
    await this.ssh.execChecked(ssh, runCmd);
  }

  async applyTenantLimits(input: {
    server: HostingServer;
    accountId: string;
    limits: TenantLimits;
    dockerContainers: string[];
  }): Promise<void> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) return;
    const ssh = this.apacheProxy.buildSshOptions(input.server);
    const basePath = cfg.basePath.replace(/\/$/, "");
    const tenant = tenantIdentity(input.accountId, basePath);
    if ((await this.ssh.exec(ssh, "test -f /etc/systemd/system/vexira.slice")).code !== 0) {
      await this.ssh.writeFile(ssh, "/etc/systemd/system/vexira.slice", TENANT_PARENT_SLICE);
    }
    await this.ssh.writeFile(
      ssh,
      `/etc/systemd/system/${tenant.slice}`,
      tenantSliceContent(input.limits),
    );
    await this.ssh.execChecked(
      ssh,
      buildTenantPrepareCommand(input.accountId, basePath, input.limits),
      120_000,
    );
    for (const name of input.dockerContainers) {
      tenantRuntimeUnit(name);
      await this.ssh.execChecked(
        ssh,
        `docker update --cpus ${input.limits.cpuPercent / 100} --memory ${input.limits.memoryMb}m --memory-swap ${input.limits.memoryMb}m ${shellQuote(name)}`,
        60_000,
      );
    }
  }

  async removeDeployment(input: {
    server: HostingServer;
    accountId: string;
    proxyServer?: HostingServer;
    deployPath?: string | null;
    containerName?: string | null;
    deployDomain?: string | null;
  }): Promise<void> {
    const cfg = this.deployConfig;
    if (cfg.mockRemote) return;

    const ssh = this.apacheProxy.buildSshOptions(input.server);

    await this.ssh.withSession(ssh, async (session) => {
      const name = input.containerName?.trim();
      if (name) {
        const unit = tenantRuntimeUnit(name);
        await session.exec(
          `systemctl disable --now ${shellQuote(unit)} >/dev/null 2>&1 || true; rm -f -- ${shellQuote(`/etc/systemd/system/${unit}`)}; systemctl daemon-reload`,
          60_000,
        );
        const deployUser = buildDeployLinuxUser(input.accountId);
        await session.exec(
          `if pgrep -u ${shellQuote(deployUser)} -f 'God Daemon' >/dev/null 2>&1; then ${runAsDeployUser(deployUser, `pm2 delete ${shellQuote(name)}`)} >/dev/null 2>&1 || true; fi`,
          60_000,
        );
        await session.exec(
          `if pgrep -u ${shellQuote(deployUser)} -f 'God Daemon' >/dev/null 2>&1; then ${runAsDeployUser(deployUser, "pm2 save")} >/dev/null 2>&1 || true; fi`,
          60_000,
        );
        const inspect = await session.exec(
          `docker inspect ${shellQuote(name)} --format '{{range .Mounts}}{{if .Name}}{{.Name}} {{end}}{{end}}' 2>/dev/null || true`,
          30_000,
        );
        const volumes = inspect.stdout.trim().split(/\s+/).filter(Boolean);
        await session.exec(`docker rm -f ${shellQuote(name)} >/dev/null 2>&1 || true`, 120_000);
        for (const volume of volumes) {
          await session.exec(`docker volume rm -f ${shellQuote(volume)} >/dev/null 2>&1 || true`);
        }
        await session.exec(`docker rmi -f ${shellQuote(name)} >/dev/null 2>&1 || true`, 120_000);
      }
      if (input.deployPath?.trim()) {
        await session.exec(`rm -rf ${shellQuote(input.deployPath.trim())}`, 180_000);
      }
      await session.exec(`docker image prune -f >/dev/null 2>&1 || true`, 120_000);
    });

    if (input.deployDomain?.trim()) {
      try {
        await this.apacheProxy.clearReverseProxy(
          input.proxyServer ?? input.server,
          input.deployDomain.trim(),
        );
      } catch {
        // Best-effort — Plesk site may already be gone
      }
    }
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gib = bytes / 1024 ** 3;
  if (gib >= 1) return `${gib.toFixed(gib >= 10 ? 1 : 2)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
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
