import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentStatus } from "@prisma/client";
import type { Queue } from "bullmq";

import { PrismaService } from "@/database/database.module";
import { DEFAULT_QUEUE } from "@/queue/queue.module";

import type { UpdateSystemSettingsDto } from "../dto/system-settings.dto";
import {
  KapitalConfigService,
  KAPITAL_PRESETS,
  type KapitalEnvironment,
} from "@/modules/payments/service/kapital-config.service";

const SETTING_KEYS = {
  registrarProvider: "registrar_provider",
  paymentProvider: "payment_provider",
  hostingProvider: "hosting_provider",
  proxmoxProvider: "proxmox_provider",
  maintenanceEnabled: "maintenance_enabled",
  maintenanceMessage: "maintenance_message",
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
      message: messageRow?.value?.trim() ?? "",
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
      maintenance: await this.resolveMaintenance(),
      note: "Provider and Kapital credentials are stored in the database and override server .env defaults.",
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
        dto.maintenanceMessage.trim(),
      );
    }

    return this.getSystemStatus();
  }

  async getPublicSystemStatus() {
    const maintenance = await this.resolveMaintenance();
    return {
      maintenance,
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
