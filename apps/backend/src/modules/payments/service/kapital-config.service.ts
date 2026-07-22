import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "@/database/database.module";

export type KapitalEnvironment = "test" | "production";

export const KAPITAL_SETTING_KEYS = {
  environment: "kapital_environment",
  username: "kapital_username",
  password: "kapital_password",
} as const;

export const KAPITAL_PRESETS: Record<
  KapitalEnvironment,
  { username: string; password: string; baseUrl: string; label: string }
> = {
  test: {
    label: "Kapital test",
    username: "TerminalSys/kapital",
    password: "kapital123",
    baseUrl: "https://txpgtst.kapitalbank.az",
  },
  production: {
    label: "Kapital production",
    username: "TerminalSys/E1210023",
    password: "QNt&2YLoh)9COsMJ*jZC",
    baseUrl: "https://e-commerce.kapitalbank.az",
  },
};

export interface ResolvedKapitalConfig {
  username: string;
  password: string;
  isDev: boolean;
  baseUrl: string;
  redirectUrl: string;
  returnUrl: string;
  language: string;
  environment: KapitalEnvironment;
  source: "database" | "env" | "preset";
}

export interface KapitalAdminSettings {
  environment: KapitalEnvironment;
  username: string;
  password: string;
  baseUrl: string;
  configured: boolean;
  source: ResolvedKapitalConfig["source"];
}

@Injectable()
export class KapitalConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private envKapital() {
    return this.configService.getOrThrow<{ kapital: {
      username: string;
      password: string;
      isDev: boolean;
      baseUrl: string;
      redirectUrl: string;
      returnUrl: string;
      language: string;
    } }>("payment").kapital;
  }

  private async readStoredSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            KAPITAL_SETTING_KEYS.environment,
            KAPITAL_SETTING_KEYS.username,
            KAPITAL_SETTING_KEYS.password,
          ],
        },
      },
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  normalizeEnvironment(value?: string | null): KapitalEnvironment | undefined {
    const raw = value?.trim().toLowerCase();
    if (raw === "test" || raw === "dev" || raw === "sandbox") return "test";
    if (raw === "production" || raw === "prod" || raw === "live") return "production";
    return undefined;
  }

  async resolve(): Promise<ResolvedKapitalConfig> {
    const envKapital = this.envKapital();
    const stored = await this.readStoredSettings();

    const storedEnvironment = this.normalizeEnvironment(stored[KAPITAL_SETTING_KEYS.environment]);
    const environment: KapitalEnvironment =
      storedEnvironment ??
      (envKapital.isDev ? "test" : "production");

    const preset = KAPITAL_PRESETS[environment];
    const username =
      stored[KAPITAL_SETTING_KEYS.username]?.trim() ||
      envKapital.username ||
      preset.username;
    const password =
      stored[KAPITAL_SETTING_KEYS.password] ||
      envKapital.password ||
      preset.password;

    let source: ResolvedKapitalConfig["source"] = "preset";
    if (stored[KAPITAL_SETTING_KEYS.username] || stored[KAPITAL_SETTING_KEYS.password]) {
      source = "database";
    } else if (envKapital.username || envKapital.password) {
      source = "env";
    }

    const baseUrl = preset.baseUrl;

    return {
      username,
      password,
      isDev: environment === "test",
      baseUrl,
      redirectUrl: envKapital.redirectUrl,
      returnUrl: envKapital.returnUrl,
      language: envKapital.language,
      environment,
      source,
    };
  }

  async getAdminSettings(): Promise<KapitalAdminSettings> {
    const resolved = await this.resolve();
    return {
      environment: resolved.environment,
      username: resolved.username,
      password: resolved.password,
      baseUrl: resolved.baseUrl,
      configured: Boolean(resolved.username && resolved.password),
      source: resolved.source,
    };
  }

  async saveAdminSettings(input: {
    environment?: KapitalEnvironment;
    username?: string;
    password?: string;
  }): Promise<KapitalAdminSettings> {
    const stored = await this.readStoredSettings();
    const currentEnvironment =
      this.normalizeEnvironment(stored[KAPITAL_SETTING_KEYS.environment]) ?? "test";

    const environment = input.environment ?? currentEnvironment;
    const preset = KAPITAL_PRESETS[environment];

    if (input.environment !== undefined) {
      await this.upsertSetting(KAPITAL_SETTING_KEYS.environment, environment);
    }

    if (input.username !== undefined) {
      await this.upsertSetting(KAPITAL_SETTING_KEYS.username, input.username.trim());
    } else if (input.environment !== undefined && !stored[KAPITAL_SETTING_KEYS.username]) {
      await this.upsertSetting(KAPITAL_SETTING_KEYS.username, preset.username);
    }

    const passwordProvided = input.password !== undefined && input.password.trim() !== "";
    if (passwordProvided) {
      await this.upsertSetting(KAPITAL_SETTING_KEYS.password, input.password!.trim());
    } else if (input.environment !== undefined && !stored[KAPITAL_SETTING_KEYS.password]) {
      await this.upsertSetting(KAPITAL_SETTING_KEYS.password, preset.password);
    }

    return this.getAdminSettings();
  }

  getPresets() {
    return KAPITAL_PRESETS;
  }

  private upsertSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
