import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "@/database/database.module";
import { decryptSecret, encryptSecret } from "@/utils/crypto.util";

export const GOOGLE_OAUTH_SETTING_KEYS = {
  clientId: "google_oauth_client_id",
  clientSecret: "google_oauth_client_secret",
  callbackUrl: "google_oauth_callback_url",
} as const;

export const GITHUB_OAUTH_SETTING_KEYS = {
  clientId: "github_oauth_client_id",
  clientSecretEnc: "github_oauth_client_secret_enc",
  callbackUrl: "github_oauth_callback_url",
  deployCallbackUrl: "github_oauth_deploy_callback_url",
} as const;

export interface ResolvedGoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  source: "database" | "env";
}

export interface GoogleOAuthAdminSettings {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  configured: boolean;
  source: ResolvedGoogleOAuthConfig["source"];
}

export interface ResolvedGitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  deployCallbackUrl: string;
  source: "database" | "env";
}

export interface GitHubOAuthAdminSettings {
  clientId: string;
  callbackUrl: string;
  deployCallbackUrl: string;
  secretConfigured: boolean;
  configured: boolean;
  source: ResolvedGitHubOAuthConfig["source"];
}

@Injectable()
export class OauthConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private envGoogle() {
    return {
      clientId: this.configService.get<string>("oauth.google.clientId") ?? "",
      clientSecret: this.configService.get<string>("oauth.google.clientSecret") ?? "",
      callbackUrl:
        this.configService.get<string>("oauth.google.callbackUrl") ??
        "http://localhost:4000/api/v1/auth/google/callback",
    };
  }

  private async readStoredGoogleSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            GOOGLE_OAUTH_SETTING_KEYS.clientId,
            GOOGLE_OAUTH_SETTING_KEYS.clientSecret,
            GOOGLE_OAUTH_SETTING_KEYS.callbackUrl,
          ],
        },
      },
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async resolveGoogle(): Promise<ResolvedGoogleOAuthConfig> {
    const env = this.envGoogle();
    const stored = await this.readStoredGoogleSettings();

    const clientId = stored[GOOGLE_OAUTH_SETTING_KEYS.clientId]?.trim() || env.clientId;
    const clientSecret = stored[GOOGLE_OAUTH_SETTING_KEYS.clientSecret]?.trim() || env.clientSecret;
    const callbackUrl = stored[GOOGLE_OAUTH_SETTING_KEYS.callbackUrl]?.trim() || env.callbackUrl;

    const hasStored =
      Boolean(stored[GOOGLE_OAUTH_SETTING_KEYS.clientId]?.trim()) ||
      Boolean(stored[GOOGLE_OAUTH_SETTING_KEYS.clientSecret]?.trim()) ||
      Boolean(stored[GOOGLE_OAUTH_SETTING_KEYS.callbackUrl]?.trim());

    return {
      clientId,
      clientSecret,
      callbackUrl,
      source: hasStored ? "database" : "env",
    };
  }

  async getGoogleAdminSettings(): Promise<GoogleOAuthAdminSettings> {
    const resolved = await this.resolveGoogle();
    return {
      clientId: resolved.clientId,
      clientSecret: resolved.clientSecret,
      callbackUrl: resolved.callbackUrl,
      configured: Boolean(resolved.clientId && resolved.clientSecret),
      source: resolved.source,
    };
  }

  async saveGoogleAdminSettings(input: {
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
  }): Promise<GoogleOAuthAdminSettings> {
    if (input.clientId !== undefined) {
      await this.upsertSetting(GOOGLE_OAUTH_SETTING_KEYS.clientId, input.clientId.trim());
    }

    const secretProvided = input.clientSecret !== undefined && input.clientSecret.trim() !== "";
    if (secretProvided) {
      await this.upsertSetting(GOOGLE_OAUTH_SETTING_KEYS.clientSecret, input.clientSecret!.trim());
    }

    if (input.callbackUrl !== undefined) {
      await this.upsertSetting(GOOGLE_OAUTH_SETTING_KEYS.callbackUrl, input.callbackUrl.trim());
    }

    return this.getGoogleAdminSettings();
  }

  private envGitHub() {
    return {
      clientId: this.configService.get<string>("oauth.github.clientId") ?? "",
      clientSecret: this.configService.get<string>("oauth.github.clientSecret") ?? "",
      callbackUrl:
        this.configService.get<string>("oauth.github.callbackUrl") ??
        "http://localhost:4000/api/v1/auth/github/callback",
      deployCallbackUrl:
        this.configService.get<string>("oauth.github.deployCallbackUrl") ??
        "http://localhost:4000/api/v1/deploy/github/oauth/callback",
    };
  }

  private async readStoredGitHubSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            GITHUB_OAUTH_SETTING_KEYS.clientId,
            GITHUB_OAUTH_SETTING_KEYS.clientSecretEnc,
            GITHUB_OAUTH_SETTING_KEYS.callbackUrl,
            GITHUB_OAUTH_SETTING_KEYS.deployCallbackUrl,
          ],
        },
      },
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  private decryptGitHubSecret(storedEnc?: string, envSecret?: string): string {
    const enc = storedEnc?.trim();
    if (enc) {
      try {
        return decryptSecret(enc);
      } catch {
        return "";
      }
    }
    return envSecret?.trim() ?? "";
  }

  async resolveGitHub(): Promise<ResolvedGitHubOAuthConfig> {
    const env = this.envGitHub();
    const stored = await this.readStoredGitHubSettings();

    const clientId = stored[GITHUB_OAUTH_SETTING_KEYS.clientId]?.trim() || env.clientId;
    const clientSecret = this.decryptGitHubSecret(
      stored[GITHUB_OAUTH_SETTING_KEYS.clientSecretEnc],
      env.clientSecret,
    );
    const callbackUrl = stored[GITHUB_OAUTH_SETTING_KEYS.callbackUrl]?.trim() || env.callbackUrl;
    const deployCallbackUrl =
      stored[GITHUB_OAUTH_SETTING_KEYS.deployCallbackUrl]?.trim() || env.deployCallbackUrl;

    const hasStored =
      Boolean(stored[GITHUB_OAUTH_SETTING_KEYS.clientId]?.trim()) ||
      Boolean(stored[GITHUB_OAUTH_SETTING_KEYS.clientSecretEnc]?.trim()) ||
      Boolean(stored[GITHUB_OAUTH_SETTING_KEYS.callbackUrl]?.trim()) ||
      Boolean(stored[GITHUB_OAUTH_SETTING_KEYS.deployCallbackUrl]?.trim());

    return {
      clientId,
      clientSecret,
      callbackUrl,
      deployCallbackUrl,
      source: hasStored ? "database" : "env",
    };
  }

  async getGitHubAdminSettings(): Promise<GitHubOAuthAdminSettings> {
    const resolved = await this.resolveGitHub();
    const stored = await this.readStoredGitHubSettings();
    return {
      clientId: resolved.clientId,
      callbackUrl: resolved.callbackUrl,
      deployCallbackUrl: resolved.deployCallbackUrl,
      secretConfigured: Boolean(stored[GITHUB_OAUTH_SETTING_KEYS.clientSecretEnc]?.trim()),
      configured: Boolean(resolved.clientId && resolved.clientSecret),
      source: resolved.source,
    };
  }

  async saveGitHubAdminSettings(input: {
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
    deployCallbackUrl?: string;
  }): Promise<GitHubOAuthAdminSettings> {
    if (input.clientId !== undefined) {
      await this.upsertSetting(GITHUB_OAUTH_SETTING_KEYS.clientId, input.clientId.trim());
    }

    const secretProvided = input.clientSecret !== undefined && input.clientSecret.trim() !== "";
    if (secretProvided) {
      await this.upsertSetting(
        GITHUB_OAUTH_SETTING_KEYS.clientSecretEnc,
        encryptSecret(input.clientSecret!.trim()),
      );
    }

    if (input.callbackUrl !== undefined) {
      await this.upsertSetting(GITHUB_OAUTH_SETTING_KEYS.callbackUrl, input.callbackUrl.trim());
    }

    if (input.deployCallbackUrl !== undefined) {
      await this.upsertSetting(
        GITHUB_OAUTH_SETTING_KEYS.deployCallbackUrl,
        input.deployCallbackUrl.trim(),
      );
    }

    return this.getGitHubAdminSettings();
  }

  private upsertSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
