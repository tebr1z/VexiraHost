import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "@/database/database.module";
import { decryptSecret, encryptSecret, hashToken } from "@/utils/crypto.util";

export const DEFAULT_TURNSTILE_SITE_KEY = "0x4AAAAAAEWxQmtfjmxvrm1J";

export const TURNSTILE_SETTING_KEYS = {
  enabled: "turnstile_enabled",
  siteKey: "turnstile_site_key",
  secretEnc: "turnstile_secret_enc",
  secretHash: "turnstile_secret_hash",
  hostnames: "turnstile_hostnames",
} as const;

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileAction =
  "login" | "signup" | "forgot-password" | "reset-password" | "contact" | "support";

export interface TurnstileAdminSettings {
  enabled: boolean;
  siteKey: string;
  secretConfigured: boolean;
  hostnames: string;
  source: "database" | "default";
}

export interface TurnstilePublicConfig {
  enabled: boolean;
  siteKey: string;
}

interface SiteverifyResult {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getPublicConfig(): Promise<TurnstilePublicConfig> {
    const resolved = await this.resolve();
    return {
      enabled: resolved.enabled,
      siteKey: resolved.enabled ? resolved.siteKey : "",
    };
  }

  async getAdminSettings(): Promise<TurnstileAdminSettings> {
    const stored = await this.readStored();
    const hasStored =
      Boolean(stored[TURNSTILE_SETTING_KEYS.enabled]) ||
      Boolean(stored[TURNSTILE_SETTING_KEYS.siteKey]) ||
      Boolean(stored[TURNSTILE_SETTING_KEYS.secretEnc]) ||
      Boolean(stored[TURNSTILE_SETTING_KEYS.hostnames]);

    return {
      enabled: stored[TURNSTILE_SETTING_KEYS.enabled] === "true",
      siteKey: stored[TURNSTILE_SETTING_KEYS.siteKey]?.trim() || DEFAULT_TURNSTILE_SITE_KEY,
      secretConfigured: Boolean(stored[TURNSTILE_SETTING_KEYS.secretEnc]?.trim()),
      hostnames: stored[TURNSTILE_SETTING_KEYS.hostnames]?.trim() ?? "",
      source: hasStored ? "database" : "default",
    };
  }

  async saveAdminSettings(input: {
    enabled?: boolean;
    siteKey?: string;
    secret?: string;
    hostnames?: string;
  }): Promise<TurnstileAdminSettings> {
    if (input.siteKey !== undefined) {
      const siteKey = input.siteKey.trim() || DEFAULT_TURNSTILE_SITE_KEY;
      await this.upsert(TURNSTILE_SETTING_KEYS.siteKey, siteKey);
    }

    if (input.hostnames !== undefined) {
      await this.upsert(TURNSTILE_SETTING_KEYS.hostnames, this.normalizeHostnames(input.hostnames));
    }

    const secretProvided = input.secret !== undefined && input.secret.trim() !== "";
    if (secretProvided) {
      const secret = input.secret!.trim();
      await this.upsert(TURNSTILE_SETTING_KEYS.secretEnc, encryptSecret(secret));
      await this.upsert(TURNSTILE_SETTING_KEYS.secretHash, hashToken(secret));
    }

    if (input.enabled !== undefined) {
      if (input.enabled) {
        const after = await this.readStored();
        if (!after[TURNSTILE_SETTING_KEYS.secretEnc]?.trim()) {
          throw new BadRequestException(
            "Turnstile secret is required before enabling bot protection",
          );
        }
      }
      await this.upsert(TURNSTILE_SETTING_KEYS.enabled, input.enabled ? "true" : "false");
    }

    return this.getAdminSettings();
  }

  async assertValid(
    token: string | undefined,
    expectedAction: TurnstileAction,
    ip?: string,
  ): Promise<void> {
    const resolved = await this.resolve();
    if (!resolved.enabled) return;

    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.length > MAX_TOKEN_LENGTH ||
      resolved.expectedHostnames.size === 0 ||
      !resolved.secret
    ) {
      throw new ForbiddenException("Bot verification failed");
    }

    let result: SiteverifyResult;
    try {
      const body = new URLSearchParams({
        secret: resolved.secret,
        response: token,
      });
      if (ip?.trim()) body.set("remoteip", ip.trim());

      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body,
      });
      if (!response.ok) {
        throw new Error(`siteverify ${response.status}`);
      }
      result = (await response.json()) as SiteverifyResult;
    } catch (err) {
      this.logger.warn(`Turnstile siteverify failed: ${String(err)}`);
      throw new ForbiddenException("Bot verification failed");
    }

    if (
      !result.success ||
      result.action !== expectedAction ||
      !result.hostname ||
      !resolved.expectedHostnames.has(result.hostname.toLowerCase())
    ) {
      throw new ForbiddenException("Bot verification failed");
    }
  }

  private async resolve(): Promise<{
    enabled: boolean;
    siteKey: string;
    secret: string | null;
    expectedHostnames: Set<string>;
  }> {
    const stored = await this.readStored();
    const secret = this.readSecret(stored);
    const enabled = stored[TURNSTILE_SETTING_KEYS.enabled] === "true" && Boolean(secret);

    return {
      enabled,
      siteKey: stored[TURNSTILE_SETTING_KEYS.siteKey]?.trim() || DEFAULT_TURNSTILE_SITE_KEY,
      secret,
      expectedHostnames: this.resolveHostnames(stored[TURNSTILE_SETTING_KEYS.hostnames]),
    };
  }

  private readSecret(stored: Record<string, string>): string | null {
    const encrypted = stored[TURNSTILE_SETTING_KEYS.secretEnc]?.trim();
    if (!encrypted) return null;

    try {
      const plain = decryptSecret(encrypted);
      const fingerprint = stored[TURNSTILE_SETTING_KEYS.secretHash]?.trim();
      if (fingerprint && hashToken(plain) !== fingerprint) {
        this.logger.error("Turnstile secret integrity check failed");
        return null;
      }
      return plain;
    } catch (err) {
      this.logger.error(`Turnstile secret decrypt failed: ${String(err)}`);
      return null;
    }
  }

  private resolveHostnames(storedRaw: string | undefined): Set<string> {
    const nodeEnv =
      this.configService.get<string>("app.nodeEnv") ?? process.env.NODE_ENV ?? "development";
    const isProduction = nodeEnv === "production";
    const hosts = new Set<string>();

    const custom = this.parseHostnames(storedRaw);
    if (custom.length > 0) {
      for (const host of custom) hosts.add(host);
    } else {
      const appUrl =
        this.configService.get<string>("app.url") ?? process.env.APP_URL ?? "http://localhost:3000";
      for (const host of this.hostnamesFromAppUrl(appUrl)) hosts.add(host);
    }

    if (!isProduction) {
      hosts.add("localhost");
      hosts.add("127.0.0.1");
    } else {
      hosts.delete("localhost");
      hosts.delete("127.0.0.1");
    }

    return hosts;
  }

  private hostnamesFromAppUrl(appUrl: string): string[] {
    try {
      const host = new URL(appUrl).hostname.toLowerCase();
      if (!host) return [];
      const hosts = new Set([host]);
      if (host.startsWith("www.")) hosts.add(host.slice(4));
      else if (host !== "localhost" && host !== "127.0.0.1") hosts.add(`www.${host}`);
      return [...hosts];
    } catch {
      return [];
    }
  }

  private parseHostnames(raw: string | undefined): string[] {
    if (!raw?.trim()) return [];
    return raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  private normalizeHostnames(raw: string): string {
    return this.parseHostnames(raw).join(",");
  }

  private async readStored(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: Object.values(TURNSTILE_SETTING_KEYS),
        },
      },
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  private upsert(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
