import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ManagedServer,
  ManagedServerFinding,
  ManagedServerTask,
  SecurityFindingSeverity,
} from "@prisma/client";

import type {
  CreateManagedServerDto,
  InstallManagedServerDto,
  UpdateManagedServerDto,
} from "./dto/managed-server.dto";
import { assertPublicManagedServerHost } from "./managed-server-host.util";
import {
  buildFeatureInstallScript,
  MANAGED_SERVER_FEATURES,
  MANAGED_SERVER_PACKAGES,
  resolveManagedServerFeatures,
  type ManagedServerFeature,
} from "./managed-server.catalog";
import { ManagedServersRepository } from "./managed-servers.repository";

import type { DeployConfig } from "@/config/deploy.config";
import { SshService, type SshConnectionOptions } from "@/modules/deploy/service/ssh.service";
import { decryptSecret, encryptSecret } from "@/utils/crypto.util";

type ServerWithData = ManagedServer & {
  findings?: ManagedServerFinding[];
  tasks?: ManagedServerTask[];
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
};

type ProbeResult = {
  osVersion: string;
  cpuLoadPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedMb: number;
  diskTotalMb: number;
  uptimeSeconds: number;
  tools: Record<string, string | null>;
};

type FindingInput = {
  key: string;
  severity: SecurityFindingSeverity;
  title: string;
  description: string;
  remediation: string;
  autoFixAvailable: boolean;
};

const PROBE_COMMAND = String.raw`set -u
printf '__OS__='; ( . /etc/os-release 2>/dev/null && printf '%s\n' "\${PRETTY_NAME:-Linux}" ) || uname -sr
printf '__CPU__='; LANG=C top -bn1 2>/dev/null | awk '/Cpu\(s\)|%Cpu/{print int(100-$8); exit}'
printf '__MEM__='; free -m | awk '/^Mem:/{print $3 ":" $2}'
printf '__DISK__='; df -Pm / | awk 'NR==2{print $3 ":" $2}'
printf '__UPTIME__='; cut -d. -f1 /proc/uptime
for tool in git docker node npm pm2 nginx plesk; do printf '__TOOL_%s__=' "$tool"; if command -v "$tool" >/dev/null 2>&1; then "$tool" --version 2>/dev/null | head -n1 || echo installed; else echo missing; fi; done`;

const SECURITY_SCAN_COMMAND = String.raw`set -u
printf '__UFW__='; if command -v ufw >/dev/null 2>&1; then ufw status 2>/dev/null | head -n1; elif command -v firewall-cmd >/dev/null 2>&1; then firewall-cmd --state 2>/dev/null || true; else echo missing; fi
printf '__FAIL2BAN__='; systemctl is-active fail2ban 2>/dev/null || echo inactive
printf '__ROOT_LOGIN__='; (sshd -T 2>/dev/null | awk '/^permitrootlogin /{print $2; exit}') || echo unknown
printf '__PASSWORD_AUTH__='; (sshd -T 2>/dev/null | awk '/^passwordauthentication /{print $2; exit}') || echo unknown
printf '__UPDATES__='; if command -v apt >/dev/null 2>&1; then apt list --upgradable 2>/dev/null | tail -n +2 | wc -l; elif command -v dnf >/dev/null 2>&1; then dnf -q check-update 2>/dev/null | awk 'NF>=3{n++} END{print n+0}'; else echo -1; fi
printf '__PORTS__='; ss -lntH 2>/dev/null | wc -l`;

function linesToMap(output: string): Record<string, string> {
  return Object.fromEntries(
    output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^__([A-Z0-9_]+)__=(.*)$/);
      return match ? [[match[1], match[2].trim()]] : [];
    }),
  );
}

function numberOrZero(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function pair(value: string | undefined): [number, number] {
  const [used, total] = (value ?? "0:0").split(":");
  return [numberOrZero(used), numberOrZero(total)];
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2000);
}

@Injectable()
export class ManagedServersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ManagedServersService.name);
  private monitorTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly repository: ManagedServersRepository,
    private readonly ssh: SshService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.monitorTimer = setInterval(() => void this.monitorAll(), 5 * 60_000);
    this.monitorTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.monitorTimer) clearInterval(this.monitorTimer);
  }

  getCatalog() {
    return { packages: MANAGED_SERVER_PACKAGES, features: MANAGED_SERVER_FEATURES };
  }

  listForUser(userId: string) {
    return this.repository
      .listForUser(userId)
      .then((rows) => rows.map((row) => this.toPublic(row)));
  }

  listAll() {
    return this.repository.listAll().then((rows) => rows.map((row) => this.toPublic(row)));
  }

  async getForUser(id: string, userId: string) {
    return this.toPublic(await this.requireOwned(id, userId));
  }

  async create(userId: string, dto: CreateManagedServerDto) {
    try {
      await assertPublicManagedServerHost(dto.host);
    } catch (error) {
      throw new BadRequestException(safeError(error));
    }
    const packageCode = dto.packageCode ?? "CUSTOM";
    const selectedFeatures = resolveManagedServerFeatures(packageCode, dto.selectedFeatures);
    try {
      const server = await this.repository.create({
        userId,
        name: dto.name.trim(),
        host: dto.host.trim().toLowerCase(),
        sshPort: dto.sshPort ?? 22,
        sshUsername: dto.sshUsername.trim(),
        sshPasswordEnc: encryptSecret(dto.sshPassword),
        packageCode,
        selectedFeatures,
      });
      const task = await this.repository.createTask({
        serverId: server.id,
        type: "CONNECTION_CHECK",
        requestedById: userId,
      });
      void this.runConnectionCheck(server, task.id);
      return { ...this.toPublic(server), connectionTaskId: task.id };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
        throw new ConflictException("This SSH endpoint is already connected to your account");
      }
      throw error;
    }
  }

  async update(id: string, userId: string, dto: UpdateManagedServerDto) {
    await this.requireOwned(id, userId);
    if (dto.host !== undefined) {
      try {
        await assertPublicManagedServerHost(dto.host);
      } catch (error) {
        throw new BadRequestException(safeError(error));
      }
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.host !== undefined) data.host = dto.host.trim().toLowerCase();
    if (dto.sshPort !== undefined) data.sshPort = dto.sshPort;
    if (dto.sshUsername !== undefined) data.sshUsername = dto.sshUsername.trim();
    if (dto.sshPassword !== undefined) data.sshPasswordEnc = encryptSecret(dto.sshPassword);
    if (dto.monitoringEnabled !== undefined) data.monitoringEnabled = dto.monitoringEnabled;
    const packageCode = dto.packageCode;
    if (packageCode !== undefined) data.packageCode = packageCode;
    if (packageCode !== undefined || dto.selectedFeatures !== undefined) {
      const current = await this.repository.findById(id);
      data.selectedFeatures = resolveManagedServerFeatures(
        packageCode ?? current!.packageCode,
        dto.selectedFeatures ?? current!.selectedFeatures,
      );
    }
    data.status = "PENDING";
    data.lastError = null;
    const updated = await this.repository.update(id, data);
    return this.toPublic(updated);
  }

  async remove(id: string, userId: string) {
    await this.requireOwned(id, userId);
    await this.repository.delete(id);
    return { id, deleted: true };
  }

  async requestConnectionCheck(id: string, userId: string) {
    const server = await this.requireOwned(id, userId);
    await this.assertNoRunningTask(id);
    const task = await this.repository.createTask({
      serverId: id,
      type: "CONNECTION_CHECK",
      requestedById: userId,
    });
    void this.runConnectionCheck(server, task.id);
    return { taskId: task.id, status: task.status };
  }

  async requestInstall(id: string, userId: string, dto: InstallManagedServerDto) {
    const server = await this.requireOwned(id, userId);
    if (!dto.confirmChanges) throw new BadRequestException("Remote changes must be confirmed");
    const features = resolveManagedServerFeatures("CUSTOM", dto.features);
    if (features.length === 0)
      throw new BadRequestException("Select at least one supported feature");
    await this.assertNoRunningTask(id);
    const needsApproval = features.includes("PLESK");
    const task = await this.repository.createTask({
      serverId: id,
      type: "INSTALL",
      status: needsApproval ? "WAITING_APPROVAL" : "QUEUED",
      requestedFeatures: features,
      requestedById: userId,
      log: needsApproval ? "Plesk installation is waiting for administrator approval.\n" : "",
    });
    if (!needsApproval) void this.runInstall(server, task.id, features);
    return { taskId: task.id, status: task.status, requiresAdminApproval: needsApproval };
  }

  async requestSecurityScan(id: string, userId: string) {
    const server = await this.requireOwned(id, userId);
    await this.assertNoRunningTask(id);
    const task = await this.repository.createTask({
      serverId: id,
      type: "SECURITY_SCAN",
      requestedById: userId,
    });
    void this.runSecurityScan(server, task.id);
    return { taskId: task.id, status: task.status };
  }

  async requestOptimizationScan(id: string, userId: string) {
    const server = await this.requireOwned(id, userId);
    await this.assertNoRunningTask(id);
    const task = await this.repository.createTask({
      serverId: id,
      type: "OPTIMIZATION_SCAN",
      requestedById: userId,
    });
    void this.runOptimizationScan(server, task.id);
    return { taskId: task.id, status: task.status };
  }

  async requestFindingFix(serverId: string, findingId: string, userId: string, confirmed: boolean) {
    const server = await this.requireOwned(serverId, userId);
    if (!confirmed) throw new BadRequestException("Security changes must be confirmed");
    const finding = await this.repository.findFindingForServer(findingId, serverId);
    if (!finding || finding.status !== "OPEN")
      throw new NotFoundException("Open finding not found");
    if (!finding.autoFixAvailable)
      throw new BadRequestException("This finding requires manual review");
    await this.assertNoRunningTask(serverId);
    const task = await this.repository.createTask({
      serverId,
      type: "SECURITY_FIX",
      requestedById: userId,
      log: `Approved remediation: ${finding.key}\n`,
    });
    void this.runSecurityFix(server, task.id, finding);
    return { taskId: task.id, status: task.status };
  }

  async approveTask(taskId: string, adminId: string) {
    const task = await this.repository.findTask(taskId);
    if (!task) throw new NotFoundException("Managed server task not found");
    if (task.status !== "WAITING_APPROVAL")
      throw new BadRequestException("Task is not waiting for approval");
    await this.assertNoRunningTask(task.serverId);
    const updated = await this.repository.updateTask(task.id, {
      status: "QUEUED",
      approvedById: adminId,
      log: `${task.log}Approved by administrator.\n`,
    });
    void this.runInstall(task.server, task.id, task.requestedFeatures as ManagedServerFeature[]);
    return { taskId: updated.id, status: updated.status };
  }

  private get mockRemote(): boolean {
    return this.config.get<DeployConfig>("deploy")?.mockRemote ?? true;
  }

  private async credentials(server: ManagedServer): Promise<SshConnectionOptions> {
    // Resolve and validate immediately before every connection, then pin SSH to
    // that public address so a DNS rebinding cannot redirect the worker inward.
    const publicAddress = await assertPublicManagedServerHost(server.host);
    return {
      host: publicAddress,
      port: server.sshPort,
      username: server.sshUsername,
      password: decryptSecret(server.sshPasswordEnc),
    };
  }

  private async requireOwned(id: string, userId: string) {
    const server = await this.repository.findForUser(id, userId);
    if (!server) throw new NotFoundException("Managed server not found");
    return server;
  }

  private async assertNoRunningTask(serverId: string) {
    if (await this.repository.hasRunningTask(serverId)) {
      throw new ConflictException("Another server task is already running");
    }
  }

  private toPublic<T extends ServerWithData>(server: T) {
    const { sshPasswordEnc: _secret, ...publicServer } = server;
    return { ...publicServer, sshPasswordConfigured: true };
  }

  private mockProbe(server: ManagedServer): ProbeResult {
    return {
      osVersion: server.osVersion ?? "Ubuntu 24.04 LTS (mock)",
      cpuLoadPercent: 18,
      memoryUsedMb: 1840,
      memoryTotalMb: 4096,
      diskUsedMb: 18432,
      diskTotalMb: 81920,
      uptimeSeconds: 864320,
      tools: {
        git: "git version 2.43.0",
        docker: "Docker version 27.0.0",
        node: "v22.0.0",
        npm: "10.8.0",
        pm2: "5.4.0",
        nginx: "nginx/1.24.0",
        plesk: null,
      },
    };
  }

  private async probe(server: ManagedServer): Promise<ProbeResult> {
    if (this.mockRemote) return this.mockProbe(server);
    const result = await this.ssh.execChecked(
      await this.credentials(server),
      PROBE_COMMAND,
      90_000,
    );
    const values = linesToMap(result);
    const [memoryUsedMb, memoryTotalMb] = pair(values.MEM);
    const [diskUsedMb, diskTotalMb] = pair(values.DISK);
    const tools = Object.fromEntries(
      ["GIT", "DOCKER", "NODE", "NPM", "PM2", "NGINX", "PLESK"].map((key) => [
        key.toLowerCase(),
        values[`TOOL_${key}`] && values[`TOOL_${key}`] !== "missing" ? values[`TOOL_${key}`] : null,
      ]),
    );
    return {
      osVersion: values.OS || "Linux",
      cpuLoadPercent: Math.min(100, numberOrZero(values.CPU)),
      memoryUsedMb,
      memoryTotalMb,
      diskUsedMb,
      diskTotalMb,
      uptimeSeconds: numberOrZero(values.UPTIME),
      tools,
    };
  }

  private async runConnectionCheck(server: ManagedServer, taskId: string) {
    await this.repository.updateTask(taskId, {
      status: "RUNNING",
      startedAt: new Date(),
      log: "Checking SSH connection and server resources…\n",
    });
    try {
      const probe = await this.probe(server);
      await this.repository.update(server.id, {
        ...probe,
        status: "ONLINE",
        lastError: null,
        lastCheckedAt: new Date(),
      });
      await this.repository.updateTask(taskId, {
        status: "SUCCESS",
        result: probe,
        log: "SSH connection successful. Metrics collected.\n",
        finishedAt: new Date(),
      });
    } catch (error) {
      const message = safeError(error);
      await this.repository.updateStatus(server.id, "OFFLINE", message);
      await this.repository.updateTask(taskId, {
        status: "FAILED",
        log: `${message}\n`,
        finishedAt: new Date(),
      });
    }
  }

  private async runInstall(
    server: ManagedServer,
    taskId: string,
    features: ManagedServerFeature[],
  ) {
    await this.repository.updateTask(taskId, {
      status: "RUNNING",
      startedAt: new Date(),
      log: "Starting approved installation…\n",
    });
    try {
      for (const feature of features) {
        await this.appendLog(taskId, `Installing ${feature}…\n`);
        if (!this.mockRemote) {
          const output = await this.ssh.execChecked(
            await this.credentials(server),
            buildFeatureInstallScript(feature),
            feature === "PLESK" ? 3_600_000 : 900_000,
          );
          if (output.trim()) await this.appendLog(taskId, `${output.slice(-4000)}\n`);
        }
        await this.appendLog(taskId, `${feature} completed.\n`);
      }
      const selectedFeatures = Array.from(new Set([...server.selectedFeatures, ...features]));
      const installedFeatures = Array.from(new Set([...server.installedFeatures, ...features]));
      await this.repository.update(server.id, {
        selectedFeatures,
        installedFeatures,
        status: "ONLINE",
        lastError: null,
      });
      await this.repository.updateTask(taskId, {
        status: "SUCCESS",
        result: { installed: features },
        finishedAt: new Date(),
      });
      const refreshed = await this.repository.findById(server.id);
      if (refreshed)
        await this.runConnectionCheck(
          refreshed,
          (
            await this.repository.createTask({
              serverId: server.id,
              type: "CONNECTION_CHECK",
              log: "Post-install verification.\n",
            })
          ).id,
        );
    } catch (error) {
      const message = safeError(error);
      await this.appendLog(taskId, `Installation failed: ${message}\n`);
      await this.repository.update(server.id, { status: "DEGRADED", lastError: message });
      await this.repository.updateTask(taskId, { status: "FAILED", finishedAt: new Date() });
    }
  }

  private async runSecurityScan(server: ManagedServer, taskId: string) {
    await this.repository.updateTask(taskId, {
      status: "RUNNING",
      startedAt: new Date(),
      log: "Running read-only security checks…\n",
    });
    try {
      const values = this.mockRemote
        ? {
            UFW: "Status: active",
            FAIL2BAN: "active",
            ROOT_LOGIN: "prohibit-password",
            PASSWORD_AUTH: "yes",
            UPDATES: "4",
            PORTS: "7",
          }
        : linesToMap(
            await this.ssh.execChecked(
              await this.credentials(server),
              SECURITY_SCAN_COMMAND,
              120_000,
            ),
          );
      const findings = this.securityFindings(values);
      for (const finding of findings)
        await this.repository.upsertFinding({ serverId: server.id, ...finding });
      await this.repository.resolveMissingFindings(
        server.id,
        findings.map((finding) => finding.key),
      );
      const securityScore = Math.max(
        0,
        100 -
          findings.reduce(
            (sum, item) =>
              sum + { INFO: 2, LOW: 6, MEDIUM: 12, HIGH: 22, CRITICAL: 35 }[item.severity],
            0,
          ),
      );
      await this.repository.update(server.id, { securityScore, lastSecurityScanAt: new Date() });
      await this.repository.updateTask(taskId, {
        status: "SUCCESS",
        result: { securityScore, findingCount: findings.length },
        log: `Security scan completed with ${findings.length} finding(s).\n`,
        finishedAt: new Date(),
      });
    } catch (error) {
      await this.failTask(taskId, error);
    }
  }

  private securityFindings(values: Record<string, string>): FindingInput[] {
    const rows: FindingInput[] = [];
    const ufw = (values.UFW ?? "").toLowerCase();
    if (!ufw.includes("active") && ufw !== "running")
      rows.push({
        key: "UFW_DISABLED",
        severity: "HIGH",
        title: "Firewall is not active",
        description: "No active UFW/firewalld policy was detected.",
        remediation: "Enable the firewall while preserving SSH access.",
        autoFixAvailable: true,
      });
    if ((values.FAIL2BAN ?? "").trim() !== "active")
      rows.push({
        key: "FAIL2BAN_MISSING",
        severity: "MEDIUM",
        title: "Brute-force protection is inactive",
        description: "Fail2ban is not running for repeated login protection.",
        remediation: "Install and enable fail2ban.",
        autoFixAvailable: true,
      });
    if (["yes", "without-password"].includes((values.ROOT_LOGIN ?? "").toLowerCase()))
      rows.push({
        key: "ROOT_LOGIN",
        severity: "HIGH",
        title: "Direct root SSH login is permitted",
        description: "Direct root access increases the impact of credential compromise.",
        remediation: "Create a sudo user and disable direct root login after verifying key access.",
        autoFixAvailable: false,
      });
    if ((values.PASSWORD_AUTH ?? "").toLowerCase() === "yes")
      rows.push({
        key: "PASSWORD_AUTH",
        severity: "MEDIUM",
        title: "SSH password authentication is enabled",
        description: "Passwords are more exposed to brute-force attacks than SSH keys.",
        remediation: "Add and verify an SSH key, then disable password authentication.",
        autoFixAvailable: false,
      });
    const updates = numberOrZero(values.UPDATES);
    if (updates > 0)
      rows.push({
        key: "PENDING_UPDATES",
        severity: updates > 20 ? "HIGH" : "MEDIUM",
        title: `${updates} security or package updates are pending`,
        description: "Outdated packages may contain known vulnerabilities.",
        remediation:
          "Review release notes, snapshot the server and apply updates in a maintenance window.",
        autoFixAvailable: false,
      });
    if (numberOrZero(values.PORTS) > 20)
      rows.push({
        key: "MANY_OPEN_PORTS",
        severity: "LOW",
        title: "Many TCP services are listening",
        description: "The server exposes more listening services than expected.",
        remediation: "Review listening ports and close unused services.",
        autoFixAvailable: false,
      });
    return rows;
  }

  private async runOptimizationScan(server: ManagedServer, taskId: string) {
    await this.repository.updateTask(taskId, {
      status: "RUNNING",
      startedAt: new Date(),
      log: "Collecting performance and capacity data…\n",
    });
    try {
      const probe = await this.probe(server);
      const memoryPercent = probe.memoryTotalMb
        ? Math.round((probe.memoryUsedMb / probe.memoryTotalMb) * 100)
        : 0;
      const diskPercent = probe.diskTotalMb
        ? Math.round((probe.diskUsedMb / probe.diskTotalMb) * 100)
        : 0;
      const penalties =
        (probe.cpuLoadPercent > 85 ? 25 : probe.cpuLoadPercent > 65 ? 10 : 0) +
        (memoryPercent > 90 ? 25 : memoryPercent > 75 ? 10 : 0) +
        (diskPercent > 90 ? 30 : diskPercent > 80 ? 15 : 0);
      const optimizationScore = Math.max(0, 100 - penalties);
      const recommendations = [
        ...(probe.cpuLoadPercent > 65
          ? ["Review high-CPU processes and PM2/container limits."]
          : []),
        ...(memoryPercent > 75
          ? ["Reduce memory pressure or add swap/RAM after workload review."]
          : []),
        ...(diskPercent > 80
          ? ["Clean old logs, build artifacts and unused container images."]
          : []),
      ];
      await this.repository.update(server.id, {
        ...probe,
        optimizationScore,
        lastOptimizationAt: new Date(),
        status: "ONLINE",
        lastCheckedAt: new Date(),
      });
      await this.repository.updateTask(taskId, {
        status: "SUCCESS",
        result: { optimizationScore, recommendations },
        log: `Optimization scan completed. Score: ${optimizationScore}/100.\n`,
        finishedAt: new Date(),
      });
    } catch (error) {
      await this.failTask(taskId, error);
    }
  }

  private async runSecurityFix(
    server: ManagedServer,
    taskId: string,
    finding: ManagedServerFinding,
  ) {
    await this.repository.updateTask(taskId, { status: "RUNNING", startedAt: new Date() });
    try {
      const command =
        finding.key === "UFW_DISABLED"
          ? `set -eu; if command -v apt-get >/dev/null 2>&1; then DEBIAN_FRONTEND=noninteractive apt-get install -y ufw; ufw allow ${server.sshPort}/tcp; ufw --force enable; elif command -v dnf >/dev/null 2>&1; then dnf install -y firewalld; systemctl enable --now firewalld; firewall-cmd --permanent --add-port=${server.sshPort}/tcp; firewall-cmd --reload; else exit 40; fi`
          : finding.key === "FAIL2BAN_MISSING"
            ? buildFeatureInstallScript("FAIL2BAN")
            : null;
      if (!command) throw new BadRequestException("No safe automatic remediation exists");
      if (!this.mockRemote)
        await this.ssh.execChecked(await this.credentials(server), command, 600_000);
      await this.repository.resolveFinding(finding.id);
      await this.repository.updateTask(taskId, {
        status: "SUCCESS",
        result: { fixed: finding.key },
        log: `${finding.key} remediation completed. A new scan is recommended.\n`,
        finishedAt: new Date(),
      });
    } catch (error) {
      await this.failTask(taskId, error);
    }
  }

  private async appendLog(taskId: string, text: string) {
    const task = await this.repository.findTask(taskId);
    if (task)
      await this.repository.updateTask(taskId, { log: `${task.log}${text}`.slice(-50_000) });
  }

  private async failTask(taskId: string, error: unknown) {
    const message = safeError(error);
    await this.repository.updateTask(taskId, {
      status: "FAILED",
      log: `${message}\n`,
      finishedAt: new Date(),
    });
  }

  private async monitorAll() {
    const servers = await this.repository.listMonitored();
    for (const server of servers) {
      if (await this.repository.hasRunningTask(server.id)) continue;
      try {
        const probe = await this.probe(server);
        await this.repository.update(server.id, {
          ...probe,
          status: "ONLINE",
          lastError: null,
          lastCheckedAt: new Date(),
        });
      } catch (error) {
        await this.repository.updateStatus(server.id, "OFFLINE", safeError(error));
        this.logger.warn(`Managed server ${server.id} monitor failed: ${safeError(error)}`);
      }
    }
  }
}
