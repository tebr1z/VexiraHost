import { hostname } from "node:os";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import Redis from "ioredis";

import type { SystemHealthItem, SystemHealthSnapshot } from "../system-report.types";
import { resolveOverallHealth } from "../utils/system-report-email.util";

import { PrismaService } from "@/database/database.module";
import { WhatsappRepository } from "@/modules/whatsapp/repository/whatsapp.repository";
import { WhatsappSessionService } from "@/modules/whatsapp/service/whatsapp-session.service";
import { DEFAULT_QUEUE } from "@/queue/queue.module";

@Injectable()
export class SystemHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly whatsappRepository: WhatsappRepository,
    private readonly whatsappSession: WhatsappSessionService,
    @Inject(DEFAULT_QUEUE) private readonly queue: Queue | null,
  ) {}

  async collectSnapshot(): Promise<SystemHealthSnapshot> {
    const [databaseOk, redisState, queueStats, smtpConfigured, whatsapp, maintenance] =
      await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkQueue(),
        Promise.resolve(this.isSmtpConfigured()),
        this.checkWhatsappGateway(),
        this.checkMaintenance(),
      ]);

    const items: SystemHealthItem[] = [
      {
        key: "api",
        label: "API Sunucusu",
        state: "ok",
        message: "NestJS API çalışıyor",
      },
      {
        key: "database",
        label: "PostgreSQL",
        state: databaseOk ? "ok" : "down",
        message: databaseOk ? "Veritabanı bağlantısı aktif" : "Veritabanına bağlanılamıyor",
      },
      {
        key: "redis",
        label: "Redis",
        state: redisState === "connected" ? "ok" : redisState === "disabled" ? "disabled" : "down",
        message:
          redisState === "connected"
            ? "Redis erişilebilir"
            : redisState === "disabled"
              ? "Redis devre dışı (REDIS_ENABLED=false)"
              : "Redis yanıt vermiyor",
      },
      {
        key: "queue",
        label: "Arka plan kuyruğu",
        state: queueStats.connected ? "ok" : redisState === "disabled" ? "disabled" : "down",
        message: queueStats.connected
          ? `Bekleyen ${queueStats.waiting}, aktif ${queueStats.active}, başarısız ${queueStats.failed}`
          : "BullMQ kuyruğu kullanılamıyor",
      },
      {
        key: "smtp",
        label: "E-posta (SMTP)",
        state: smtpConfigured ? "ok" : "warning",
        message: smtpConfigured
          ? "SMTP yapılandırması mevcut"
          : "SMTP ayarları eksik — e-posta gönderilemez",
      },
      whatsapp,
      maintenance,
    ];

    return {
      checkedAt: new Date().toISOString(),
      hostname: hostname(),
      nodeEnv: process.env.NODE_ENV ?? "development",
      overall: resolveOverallHealth(items),
      items,
      queue: queueStats.connected
        ? {
            connected: true,
            waiting: queueStats.waiting,
            active: queueStats.active,
            failed: queueStats.failed,
          }
        : undefined,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<"connected" | "disabled" | "down"> {
    if (this.config.get<string>("REDIS_ENABLED") === "false") return "disabled";
    const url = this.config.get<string>("redis.url") ?? "redis://localhost:6379";
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    try {
      await client.connect();
      await client.ping();
      await client.quit();
      return "connected";
    } catch {
      try {
        client.disconnect();
      } catch {
        // ignore cleanup errors
      }
      return "down";
    }
  }

  private async checkQueue(): Promise<{
    connected: boolean;
    waiting: number;
    active: number;
    failed: number;
  }> {
    if (!this.queue) {
      return { connected: false, waiting: 0, active: 0, failed: 0 };
    }

    try {
      const counts = await this.queue.getJobCounts("waiting", "active", "failed");
      return {
        connected: true,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        failed: counts.failed ?? 0,
      };
    } catch {
      return { connected: false, waiting: 0, active: 0, failed: 0 };
    }
  }

  private isSmtpConfigured(): boolean {
    const host = this.config.get<string>("SMTP_HOST", "").trim();
    const user = this.config.get<string>("SMTP_USER", "").trim();
    const pass = this.config.get<string>("SMTP_PASS", "").trim();
    return Boolean(host && user && pass);
  }

  private async checkWhatsappGateway(): Promise<SystemHealthItem> {
    const accounts = await this.whatsappRepository.listGatewayAccounts();
    const enabled = accounts.filter((account) => account.isEnabled);
    const connected = enabled.filter((account) => this.whatsappSession.isConnected(account.id));

    if (enabled.length === 0) {
      return {
        key: "whatsapp",
        label: "WhatsApp Gateway",
        state: "warning",
        message: "Etkin WhatsApp hesabı yok",
      };
    }

    if (connected.length === 0) {
      return {
        key: "whatsapp",
        label: "WhatsApp Gateway",
        state: "down",
        message: `${enabled.length} etkin hesap var, hiçbiri bağlı değil`,
      };
    }

    return {
      key: "whatsapp",
      label: "WhatsApp Gateway",
      state: connected.length < enabled.length ? "warning" : "ok",
      message:
        connected.length < enabled.length
          ? `${connected.length}/${enabled.length} hesap bağlı`
          : `${connected.length} hesap bağlı ve hazır`,
    };
  }

  private async checkMaintenance(): Promise<SystemHealthItem> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: "maintenance_enabled" },
    });
    const enabled = row?.value === "true";
    return {
      key: "maintenance",
      label: "Bakım modu",
      state: enabled ? "warning" : "ok",
      message: enabled ? "Site bakım modunda" : "Kapalı",
    };
  }
}
