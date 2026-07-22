import type { HostingPanel } from "@prisma/client";

export interface PanelEndpoint {
  connectHost: string;
  connectPort: number;
  /** Public URL shown to customers (hostname preferred). */
  panelOrigin: string;
  /** Same as panelOrigin — browser session login target. */
  sessionOrigin: string;
  /** Backend API target (usually server IP:8443). */
  apiOrigin: string;
  /** Legacy: login path from hostname URL — not used for API session login. */
  customLoginPath?: string;
}

function parseHostPort(value: string): { host: string; port?: number } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return {
        host: url.hostname,
        port: url.port ? Number(url.port) : undefined,
      };
    } catch {
      return null;
    }
  }

  const match = trimmed.match(/^(\[[\da-f:]+\]|[^:/]+)(?::(\d+))?/i);
  if (!match?.[1]) return null;
  return {
    host: match[1],
    port: match[2] ? Number(match[2]) : undefined,
  };
}

function defaultPanelPort(panel: HostingPanel): number {
  return panel === "CPANEL" ? 2083 : 8443;
}

function defaultAdminPort(panel: HostingPanel): number {
  return panel === "CPANEL" ? 2087 : 8443;
}

function buildOrigin(host: string, port: number): string {
  return `https://${host}${port === 443 ? "" : `:${port}`}`;
}

export function normalizePanelHostname(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const path = url.pathname === "/" ? "" : url.pathname;
      const port = url.port ? `:${url.port}` : "";
      return `${url.protocol}//${url.hostname.toLowerCase()}${port}${path}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed.toLowerCase();
}

/** Strip login path from admin-entered panel URL — hostname only for public access. */
export function normalizePanelHostnameForStorage(
  value: string,
  panel?: HostingPanel,
): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const port =
        url.port ||
        (panel === "PLESK" ? "8443" : panel === "CPANEL" ? "2083" : "");
      const portSuffix = port ? `:${port}` : "";
      return `${url.protocol}//${url.hostname.toLowerCase()}${portSuffix}`;
    } catch {
      return trimmed;
    }
  }

  if (panel === "PLESK" && !/:\d+$/.test(trimmed)) {
    return `${trimmed.toLowerCase()}:8443`;
  }

  return trimmed.toLowerCase();
}

export function resolvePanelEndpoint(
  server: Pick<{ hostname: string; ipAddress: string; panel: HostingPanel }, "hostname" | "ipAddress" | "panel">,
): PanelEndpoint {
  const panel = server.panel;
  const userPort = defaultPanelPort(panel);
  const adminPort = defaultAdminPort(panel);

  let customLoginPath: string | undefined;
  let hostnameHost: string | undefined;
  let hostnamePort: number | undefined;

  const hostnameRaw = server.hostname.trim();
  if (hostnameRaw) {
    if (/^https?:\/\//i.test(hostnameRaw)) {
      try {
        const url = new URL(hostnameRaw);
        hostnameHost = url.hostname.toLowerCase();
        hostnamePort = url.port ? Number(url.port) : undefined;
        if (url.pathname && url.pathname !== "/") {
          customLoginPath = url.pathname;
        }
      } catch {
        /* fall through */
      }
    } else {
      const parsed = parseHostPort(hostnameRaw);
      if (parsed) {
        hostnameHost = parsed.host.toLowerCase();
        hostnamePort = parsed.port;
      }
    }
  }

  const ipParsed = parseHostPort(server.ipAddress);
  const connectHost = ipParsed?.host ?? hostnameHost ?? hostnameRaw;
  const connectPort = ipParsed?.port ?? hostnamePort ?? adminPort;

  const sessionHost = hostnameHost ?? ipParsed?.host ?? connectHost;
  const defaultSessionPort = defaultPanelPort(panel);
  const sessionPort = hostnameHost
    ? (hostnamePort ?? defaultSessionPort)
    : (ipParsed?.port ?? defaultSessionPort);
  const sessionOrigin = buildOrigin(sessionHost, sessionPort);
  const panelOrigin = sessionOrigin;

  const apiHost = ipParsed?.host ?? hostnameHost ?? connectHost;
  const apiPort = ipParsed?.port ?? hostnamePort ?? adminPort;
  const apiOrigin = buildOrigin(apiHost, apiPort);

  return {
    connectHost,
    connectPort,
    panelOrigin,
    sessionOrigin,
    apiOrigin,
    customLoginPath,
  };
}

export function isMockPanelServer(
  server: Pick<{ hostname: string; ipAddress: string }, "hostname" | "ipAddress">,
): boolean {
  const combined = `${server.hostname} ${server.ipAddress}`.toLowerCase();
  return (
    combined.includes(".local") ||
    combined.includes("localhost") ||
    combined.includes("127.0.0.1")
  );
}

/**
 * Plesk official single-use login URL (NOT login_up.php).
 * Linux uses PHPSESSID; Windows uses PLESKSESSID — include both for compatibility.
 * @see https://docs.plesk.com/en-US/obsidian/administrator-guide/plesk-administration/automatic-logging-in-to-plesk.80002/
 * @see https://support.plesk.com/hc/en-us/articles/12377670069655
 */
export function buildPleskSessionLoginUrl(
  endpoint: PanelEndpoint,
  sessionId: string,
  redirectPath = "/smb/web/view",
): string {
  const origin = endpoint.sessionOrigin.replace(/\/$/, "");
  const redirect = encodeURIComponent(redirectPath);
  const token = encodeURIComponent(sessionId);
  return `${origin}/enterprise/rsession_init.php?PHPSESSID=${token}&PLESKSESSID=${token}&success_redirect_url=${redirect}`;
}
