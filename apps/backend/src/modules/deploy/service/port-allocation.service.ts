import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { HostingServer } from "@prisma/client";

import { DeployRepository } from "../repository/deploy.repository";
import type { DeployRuntime } from "../utils/deploy-runtime.util";
import { resolveHostingServerSshOptions } from "../utils/server-ssh.util";

import { SshService, type SshConnectionOptions } from "./ssh.service";

import type { DeployConfig } from "@/config/deploy.config";

@Injectable()
export class PortAllocationService {
  constructor(
    private readonly deployRepository: DeployRepository,
    private readonly configService: ConfigService,
    private readonly ssh: SshService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  private buildSshOptions(server: HostingServer): SshConnectionOptions {
    const cfg = this.deployConfig;
    const options = resolveHostingServerSshOptions(server, cfg.sshPort);
    if (cfg.sshUser) {
      return { ...options, username: cfg.sshUser };
    }
    return options;
  }

  /**
   * Pick the first free host port in [portMin, portMax] (default 3000–3999),
   * skipping ports already used by other deployments and (optionally) ports
   * that are already listening on the server.
   */
  async allocate(
    serverId: string,
    options?: {
      excludePorts?: number[];
      blockedExtra?: Iterable<number>;
    },
  ): Promise<number> {
    const { portMin, portMax } = this.deployConfig;
    const used = await this.deployRepository.listUsedPortsOnServer(serverId);
    const usedSet = new Set(used);
    for (const port of options?.excludePorts ?? []) {
      usedSet.delete(port);
    }
    for (const port of options?.blockedExtra ?? []) {
      usedSet.add(port);
    }

    for (let port = portMin; port <= portMax; port += 1) {
      if (!usedSet.has(port)) return port;
    }

    throw new BadRequestException(`No free deploy ports between ${portMin} and ${portMax}`);
  }

  /** Ports currently accepting TCP connections on the server (ss/netstat). */
  async listListeningPorts(server: HostingServer): Promise<Set<number>> {
    if (this.deployConfig.mockRemote) return new Set();

    const { portMin, portMax } = this.deployConfig;
    const ssh = this.buildSshOptions(server);
    const result = await this.ssh.withSession(ssh, async (session) => {
      return session.exec(
        `(ss -tlnH 2>/dev/null || ss -tln 2>/dev/null || netstat -tln 2>/dev/null || true)`,
        30_000,
      );
    });

    const ports = new Set<number>();
    for (const match of result.stdout.matchAll(/:(\d+)\s/g)) {
      const port = Number(match[1]);
      if (Number.isInteger(port) && port >= portMin && port <= portMax) {
        ports.add(port);
      }
    }
    return ports;
  }

  /**
   * Keep the preferred port when free or already owned by our container;
   * otherwise scan 3000+ sequentially for the next free slot on DB + server.
   */
  async resolveHostPort(
    server: HostingServer,
    options: {
      prefer?: number | null;
      containerName?: string | null;
      runtime?: DeployRuntime;
    },
  ): Promise<{ port: number; switchedFrom: number | null }> {
    const prefer = options.prefer && options.prefer > 0 ? options.prefer : null;
    const listening = await this.listListeningPorts(server);

    if (prefer != null) {
      const busy = listening.has(prefer);
      if (!busy) {
        return { port: prefer, switchedFrom: null };
      }
      if (options.containerName) {
        const owned =
          options.runtime === "pm2"
            ? await this.portBoundByPm2(server, options.containerName)
            : (await this.portBoundByContainer(server, prefer)) === options.containerName;
        if (owned) {
          return { port: prefer, switchedFrom: null };
        }
      }
      const next = await this.allocate(server.id, {
        excludePorts: [prefer],
        blockedExtra: listening,
      });
      return { port: next, switchedFrom: prefer };
    }

    const port = await this.allocate(server.id, { blockedExtra: listening });
    return { port, switchedFrom: null };
  }

  private async portBoundByPm2(server: HostingServer, processName: string): Promise<boolean> {
    if (this.deployConfig.mockRemote) return true;
    const ssh = this.buildSshOptions(server);
    const result = await this.ssh.withSession(ssh, async (session) => {
      return session.exec(`pm2 pid ${this.shellQuote(processName)} 2>/dev/null || echo 0`, 30_000);
    });
    return /^\d+$/.test(result.stdout.trim()) && result.stdout.trim() !== "0";
  }

  private async portBoundByContainer(
    server: HostingServer,
    hostPort: number,
  ): Promise<string | null> {
    if (this.deployConfig.mockRemote) return null;
    const ssh = this.buildSshOptions(server);
    const result = await this.ssh.withSession(ssh, async (session) => {
      return session.exec(
        `docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -E '[:.]${hostPort}->' | head -n 1 || true`,
        30_000,
      );
    });
    const line = result.stdout.trim();
    if (!line) return null;
    return line.split(/\s+/)[0] ?? null;
  }

  private shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}
