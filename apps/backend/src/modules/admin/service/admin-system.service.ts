import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentStatus } from "@prisma/client";
import type { Queue } from "bullmq";

import type { UpdateSystemSettingsDto } from "../dto/system-settings.dto";

import { PrismaService } from "@/database/database.module";
import { OauthConfigService } from "@/modules/auth/service/oauth-config.service";
import { SiteAccessService, SITE_SECTIONS } from "@/modules/auth/service/site-access.service";
import { TurnstileService } from "@/modules/auth/service/turnstile.service";
import {
  KapitalConfigService,
  KAPITAL_PRESETS,
  type KapitalEnvironment,
} from "@/modules/payments/service/kapital-config.service";
import { DEFAULT_QUEUE } from "@/queue/queue.module";
import { parseLocalizedText, stringifyLocalizedText } from "@/shared/i18n/localized-text";

const SETTING_KEYS = {
  registrarProvider: "registrar_provider",
  paymentProvider: "payment_provider",
  hostingProvider: "hosting_provider",
  proxmoxProvider: "proxmox_provider",
  maintenanceEnabled: "maintenance_enabled",
  maintenanceMessage: "maintenance_message",
  announcementEnabled: "announcement_enabled",
  announcementTitle: "announcement_title",
  announcementMessage: "announcement_message",
} as const;

@Injectable()
export class AdminSystemRepository {
  constructor(private readonly prisma: PrismaService) {}

  getSettings() {
    return this.prisma.systemSetting.findMany();
  }

  upsertSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  findSetting(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }
}

@Injectable()
export class AdminSystemService {
  constructor(
    private readonly configService: ConfigService,
    private readonly systemRepository: AdminSystemRepository,
    private readonly kapitalConfigService: KapitalConfigService,
    private readonly oauthConfigService: OauthConfigService,
    private readonly turnstileService: TurnstileService,
    private readonly siteAccessService: SiteAccessService,
    @Inject(DEFAULT_QUEUE) private readonly queue: Queue | null,
  ) {}

  private envDefaults() {
    return {
      registrarProvider: this.configService.get<string>("registrar.provider") ?? "mock",
      paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
      hostingProvider: process.env.HOSTING_PROVIDER ?? "mock",
      proxmoxProvider: this.configService.get<string>("proxmox.provider") ?? "mock",
    };
  }

  private async resolveProviders() {
    const defaults = this.envDefaults();
    const stored = await this.systemRepository.getSettings();
    const map = Object.fromEntries(stored.map((s) => [s.key, s.value]));

    return {
      registrarProvider: map[SETTING_KEYS.registrarProvider] ?? defaults.registrarProvider,
      paymentProvider: map[SETTING_KEYS.paymentProvider] ?? defaults.paymentProvider,
      hostingProvider: map[SETTING_KEYS.hostingProvider] ?? defaults.hostingProvider,
      proxmoxProvider: map[SETTING_KEYS.proxmoxProvider] ?? defaults.proxmoxProvider,
    };
  }

  private async resolveMaintenance() {
    const [enabledRow, messageRow] = await Promise.all([
      this.systemRepository.findSetting(SETTING_KEYS.maintenanceEnabled),
      this.systemRepository.findSetting(SETTING_KEYS.maintenanceMessage),
    ]);
    return {
      enabled: enabledRow?.value === "true",
      message: parseLocalizedText(messageRow?.value),
    };
  }

  private async resolveAnnouncement() {
    const [enabledRow, titleRow, messageRow] = await Promise.all([
      this.systemRepository.findSetting(SETTING_KEYS.announcementEnabled),
      this.systemRepository.findSetting(SETTING_KEYS.announcementTitle),
      this.systemRepository.findSetting(SETTING_KEYS.announcementMessage),
    ]);
    return {
      enabled: enabledRow?.value === "true",
      title: parseLocalizedText(titleRow?.value),
      message: parseLocalizedText(messageRow?.value),
    };
  }

  async getSystemStatus() {
    const providers = await this.resolveProviders();
    const envDefaults = this.envDefaults();

    let queueStatus: {
      connected: boolean;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    } = {
      connected: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    if (this.queue) {
      try {
        const counts = await this.queue.getJobCounts("waiting", "active", "completed", "failed");
        queueStatus = {
          connected: true,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
        };
      } catch {
        queueStatus.connected = false;
      }
    }

    return {
      nodeEnv: process.env.NODE_ENV ?? "development",
      queue: queueStatus,
      providers,
      envDefaults,
      kapital: await this.kapitalConfigService.getAdminSettings(),
      kapitalPresets: KAPITAL_PRESETS,
      googleOAuth: await this.oauthConfigService.getGoogleAdminSettings(),
      turnstile: await this.turnstileService.getAdminSettings(),
      access: await this.siteAccessService.getConfig(),
      maintenance: await this.resolveMaintenance(),
      announcement: await this.resolveAnnouncement(),
      note: "Provider, Kapital, Google OAuth, and Turnstile credentials stored in the database override server defaults.",
    };
  }

  async updateSettings(dto: UpdateSystemSettingsDto) {
    const entries: Array<[string, string | undefined]> = [
      [SETTING_KEYS.registrarProvider, dto.registrarProvider],
      [SETTING_KEYS.paymentProvider, dto.paymentProvider],
      [SETTING_KEYS.hostingProvider, dto.hostingProvider],
      [SETTING_KEYS.proxmoxProvider, dto.proxmoxProvider],
    ];

    for (const [key, value] of entries) {
      if (value !== undefined) {
        await this.systemRepository.upsertSetting(key, value);
      }
    }

    if (
      dto.kapitalEnvironment !== undefined ||
      dto.kapitalUsername !== undefined ||
      dto.kapitalPassword !== undefined
    ) {
      await this.kapitalConfigService.saveAdminSettings({
        environment: dto.kapitalEnvironment as KapitalEnvironment | undefined,
        username: dto.kapitalUsername,
        password: dto.kapitalPassword,
      });
    }

    if (dto.maintenanceEnabled !== undefined) {
      await this.systemRepository.upsertSetting(
        SETTING_KEYS.maintenanceEnabled,
        dto.maintenanceEnabled ? "true" : "false",
      );
    }
    if (dto.maintenanceMessage !== undefined) {
      await this.systemRepository.upsertSetting(
        SETTING_KEYS.maintenanceMessage,
        stringifyLocalizedText(parseLocalizedText(dto.maintenanceMessage)),
      );
    }

    if (dto.announcementEnabled !== undefined) {
      await this.systemRepository.upsertSetting(
        SETTING_KEYS.announcementEnabled,
        dto.announcementEnabled ? "true" : "false",
      );
    }
    if (dto.announcementTitle !== undefined) {
      await this.systemRepository.upsertSetting(
        SETTING_KEYS.announcementTitle,
        stringifyLocalizedText(parseLocalizedText(dto.announcementTitle)),
      );
    }
    if (dto.announcementMessage !== undefined) {
      await this.systemRepository.upsertSetting(
        SETTING_KEYS.announcementMessage,
        stringifyLocalizedText(parseLocalizedText(dto.announcementMessage)),
      );
    }

    if (
      dto.loginEnabled !== undefined ||
      dto.registerEnabled !== undefined ||
      dto.loginMessage !== undefined ||
      dto.registerMessage !== undefined ||
      dto.sectionBlocks !== undefined
    ) {
      const sections =
        dto.sectionBlocks == null
          ? undefined
          : Object.fromEntries(
              SITE_SECTIONS.filter((key) => dto.sectionBlocks?.[key] !== undefined).map((key) => [
                key,
                {
                  blocked: dto.sectionBlocks?.[key]?.blocked,
                  message: dto.sectionBlocks?.[key]?.message
                    ? parseLocalizedText(dto.sectionBlocks[key]?.message)
                    : undefined,
                },
              ]),
            );
      await this.siteAccessService.save({
        loginEnabled: dto.loginEnabled,
        registerEnabled: dto.registerEnabled,
        loginMessage: dto.loginMessage ? parseLocalizedText(dto.loginMessage) : undefined,
        registerMessage: dto.registerMessage ? parseLocalizedText(dto.registerMessage) : undefined,
        sections,
      });
    }

    if (
      dto.googleClientId !== undefined ||
      dto.googleClientSecret !== undefined ||
      dto.googleCallbackUrl !== undefined
    ) {
      await this.oauthConfigService.saveGoogleAdminSettings({
        clientId: dto.googleClientId,
        clientSecret: dto.googleClientSecret,
        callbackUrl: dto.googleCallbackUrl,
      });
    }

    if (
      dto.turnstileEnabled !== undefined ||
      dto.turnstileSiteKey !== undefined ||
      dto.turnstileSecret !== undefined ||
      dto.turnstileHostnames !== undefined
    ) {
      await this.turnstileService.saveAdminSettings({
        enabled: dto.turnstileEnabled,
        siteKey: dto.turnstileSiteKey,
        secret: dto.turnstileSecret,
        hostnames: dto.turnstileHostnames,
      });
    }

    return this.getSystemStatus();
  }

  async getPublicSystemStatus() {
    const [maintenance, announcement, turnstile, access] = await Promise.all([
      this.resolveMaintenance(),
      this.resolveAnnouncement(),
      this.turnstileService.getPublicConfig(),
      this.siteAccessService.getConfig(),
    ]);
    return {
      maintenance,
      announcement,
      turnstile,
      access,
      checkedAt: new Date().toISOString(),
    };
  }
}

export interface AdminPaymentsFilter {
  status?: PaymentStatus;
  search?: string;
}

@Injectable()
export class AdminPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPayments(filters: AdminPaymentsFilter = {}) {
    const where: {
      status?: PaymentStatus;
      user?: { email: { contains: string; mode: "insensitive" } };
    } = {};

    if (filters.status) where.status = filters.status;
    if (filters.search?.trim()) {
      where.user = { email: { contains: filters.search.trim(), mode: "insensitive" } };
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        method: { select: { id: true, label: true, brand: true, last4: true } },
      },
    });
  }
}
