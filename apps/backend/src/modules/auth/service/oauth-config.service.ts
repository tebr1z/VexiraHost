import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "@/database/database.module";

export const GOOGLE_OAUTH_SETTING_KEYS = {
  clientId: "google_oauth_client_id",
  clientSecret: "google_oauth_client_secret",
  callbackUrl: "google_oauth_callback_url",
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

  private upsertSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
