import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppDeployment, HostingServer } from "@prisma/client";

import { ApacheProxyService } from "./remote-deploy.service";
import { SshService } from "./ssh.service";

import type { DeployConfig } from "@/config/deploy.config";

export type DeployHealthCheckItem = {
  id: "container" | "port" | "domain" | "public";
  ok: boolean;
  label: string;
  detail: string;
};

export type DeployHealthResult = {
  ok: boolean;
  checkedAt: string;
  hostPort: number;
  containerPort: number;
  containerName: string | null;
  deployDomain: string;
  checks: DeployHealthCheckItem[];
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Avoid `curl ... || echo 000` doubling (000000) when curl prints 000 then shell echoes 000. */
function parseHttpStatus(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 3) return digits.slice(-3);
  return "000";
}

function httpOk(code: string): boolean {
  return code.startsWith("2") || code.startsWith("3");
}

const CURL_HTTP = (url: string, timeoutSec: number) =>
  `curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time ${timeoutSec} ${shellQuote(url)} 2>/dev/null || true`;

@Injectable()
export class DeployHealthService {
  constructor(
    private readonly ssh: SshService,
    private readonly apacheProxy: ApacheProxyService,
    private readonly configService: ConfigService,
  ) {}

  private get deployConfig(): DeployConfig {
    return this.configService.get<DeployConfig>("deploy")!;
  }

  async check(deployment: AppDeployment, server: HostingServer): Promise<DeployHealthResult> {
    const checkedAt = new Date().toISOString();
    const base = {
      checkedAt,
      hostPort: deployment.hostPort,
      containerPort: deployment.containerPort,
      containerName: deployment.containerName,
      deployDomain: deployment.deployDomain,
    };

    if (this.deployConfig.mockRemote) {
      return {
        ...base,
        ok: true,
        checks: [
          { id: "container", ok: true, label: "Container", detail: "running (mock)" },
          {
            id: "port",
            ok: true,
            label: "Local port",
            detail: `HTTP 200 on 127.0.0.1:${deployment.hostPort} (mock)`,
          },
          {
            id: "domain",
            ok: true,
            label: "Domain / Apache",
            detail: `HTTPS 200 for ${deployment.deployDomain} (mock)`,
          },
          { id: "public", ok: true, label: "Public URL", detail: "HTTPS 200 (mock)" },
        ],
      };
    }

    if (!deployment.containerName?.trim()) {
      return {
        ...base,
        ok: false,
        checks: [
          {
            id: "container",
            ok: false,
            label: "Container",
            detail: "No container recorded — redeploy may be required",
          },
        ],
      };
    }

    const ssh = this.apacheProxy.buildSshOptions(server);
    const checks: DeployHealthCheckItem[] = [];
    let domainCode = "000";
    let domainOk = false;

    await this.ssh.withSession(
      ssh,
      async (session) => {
        const containerName = deployment.containerName!;
        const hostPort = deployment.hostPort;
        const domain = deployment.deployDomain;

        const inspect = await session.exec(
          `docker inspect -f '{{.State.Status}} restarts={{.RestartCount}}' ${shellQuote(containerName)} 2>/dev/null || echo 'missing'`,
          30_000,
        );
        const inspectLine = inspect.stdout.trim();
        const containerStatus = inspectLine.split(/\s+/)[0] ?? "missing";
        const restarting = /restarts=([1-9]\d*)/.test(inspectLine);

        checks.push({
          id: "container",
          ok: containerStatus === "running" && !restarting,
          label: "Container",
          detail:
            containerStatus === "running"
              ? restarting
                ? `Docker container "${containerName}" is running but restarting (${inspectLine})`
                : `Docker container "${containerName}" is running`
              : `Container status: ${inspectLine || "not found"}`,
        });

        const portMap = await session.exec(
          `docker port ${shellQuote(containerName)} ${deployment.containerPort} 2>/dev/null || true`,
          30_000,
        );
        const portDetail = portMap.stdout.trim() || portMap.stderr.trim();
        const portMapped =
          portDetail.includes(`127.0.0.1:${hostPort}`) || portDetail.includes(`:${hostPort}`);

        const localHttp = await session.exec(CURL_HTTP(`http://127.0.0.1:${hostPort}/`, 8), 30_000);
        const localCode = parseHttpStatus(localHttp.stdout);
        const localOk = httpOk(localCode);

        let portDetailText = localOk
          ? `HTTP ${localCode} on 127.0.0.1:${hostPort}${portMapped ? "" : " (port mapping mismatch)"}`
          : `No HTTP response on 127.0.0.1:${hostPort} (HTTP ${localCode})${portDetail ? ` · map: ${portDetail}` : ""}`;

        if (!localOk) {
          const listen = await session.exec(
            `(ss -tln 2>/dev/null || netstat -tln 2>/dev/null) | grep ':${hostPort} ' || true`,
            15_000,
          );
          if (listen.stdout.trim()) {
            portDetailText += ` · socket: ${listen.stdout.trim()}`;
          }
          const logs = await session.exec(
            `docker logs --tail 25 ${shellQuote(containerName)} 2>&1`,
            30_000,
          );
          const logTail = logs.stdout.trim().split("\n").slice(-8).join("\n");
          if (logTail) {
            portDetailText += `\n--- recent container logs ---\n${logTail}`;
          }
        }

        checks.push({
          id: "port",
          ok: localOk && portMapped,
          label: "Local port",
          detail: portDetailText,
        });

        const domainHttp = await session.exec(CURL_HTTP(`https://${domain}/`, 12), 30_000);
        domainCode = parseHttpStatus(domainHttp.stdout);
        domainOk = httpOk(domainCode);

        checks.push({
          id: "domain",
          ok: domainOk,
          label: "Domain / Apache",
          detail: domainOk
            ? `HTTPS ${domainCode} for https://${domain}/`
            : `HTTPS ${domainCode} for https://${domain}/ — Apache proxy may not reach the container (check vhost.conf)`,
        });
      },
      120_000,
    );

    checks.push({
      id: "public",
      ok: false,
      label: "Public URL",
      detail: "",
    });

    const publicCheck = await this.checkPublicUrl(deployment.deployDomain, domainOk, domainCode);
    checks[checks.length - 1] = {
      id: "public",
      ok: publicCheck.ok,
      label: "Public URL",
      detail: publicCheck.detail,
    };

    return {
      ...base,
      ok: checks.every((item) => item.ok),
      checks,
    };
  }

  private async checkPublicUrl(
    domain: string,
    serverDomainOk: boolean,
    serverDomainCode: string,
  ): Promise<{ ok: boolean; detail: string }> {
    if (serverDomainOk) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        const response = await fetch(`https://${domain}/`, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timer);
        const ok = response.status >= 200 && response.status < 500;
        return {
          ok,
          detail: ok
            ? `HTTPS ${response.status} from public internet`
            : `HTTPS ${response.status} from public internet (server sees ${serverDomainCode})`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed";
        return {
          ok: true,
          detail: `Server HTTPS ${serverDomainCode} OK — API host could not reach ${domain} (${message}); site may still work for visitors`,
        };
      }
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const response = await fetch(`https://${domain}/`, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timer);
      const ok = response.status >= 200 && response.status < 500;
      return {
        ok,
        detail: ok
          ? `HTTPS ${response.status} from public internet`
          : `HTTPS ${response.status} from public internet`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      return {
        ok: false,
        detail: `Public HTTPS unreachable (${message}) — fix local port & Apache proxy first`,
      };
    }
  }
}
