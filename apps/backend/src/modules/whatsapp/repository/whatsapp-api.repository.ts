import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/database/database.module";

export function currentUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

@Injectable()
export class WhatsappApiRepository {
  constructor(private readonly prisma: PrismaService) {}

  userExists(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  getAccess(userId: string) {
    return this.prisma.whatsappApiAccess.findUnique({ where: { userId } });
  }

  upsertAccess(
    userId: string,
    data: { isEnabled: boolean; monthlyLimit: number; legacyManualAccess?: boolean },
  ) {
    const { legacyManualAccess, ...rest } = data;
    return this.prisma.whatsappApiAccess.upsert({
      where: { userId },
      create: {
        userId,
        ...rest,
        legacyManualAccess: legacyManualAccess ?? false,
      },
      update: {
        ...rest,
        ...(legacyManualAccess !== undefined ? { legacyManualAccess } : {}),
      },
    });
  }

  getUsage(userId: string, periodStart = currentUtcMonth()) {
    return this.prisma.whatsappApiUsage.findUnique({
      where: { userId_periodStart: { userId, periodStart } },
    });
  }

  getPendingPackage(userId: string) {
    return this.prisma.addonService.findFirst({
      where: {
        userId,
        type: "WHATSAPP_API",
        status: "PROVISIONING",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  }

  listKeys(userId: string) {
    return this.prisma.whatsappApiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastFour: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  countActiveKeys(userId: string) {
    return this.prisma.whatsappApiKey.count({
      where: { userId, isActive: true, revokedAt: null },
    });
  }

  async createKeyWithLimit(
    data: {
      userId: string;
      name: string;
      keyPrefix: string;
      keyHash: string;
      lastFour: string;
    },
    activeLimit: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.userId}))`;
      const activeCount = await tx.whatsappApiKey.count({
        where: { userId: data.userId, isActive: true, revokedAt: null },
      });
      if (activeCount >= activeLimit) return null;
      return tx.whatsappApiKey.create({ data });
    });
  }

  revokeKey(userId: string, keyId: string) {
    return this.prisma.whatsappApiKey.updateMany({
      where: { id: keyId, userId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
  }

  async setKeyActive(
    userId: string,
    keyId: string,
    isActive: boolean,
    activeLimit: number,
  ): Promise<"UPDATED" | "NOT_FOUND" | "LIMIT_REACHED"> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const key = await tx.whatsappApiKey.findFirst({ where: { id: keyId, userId } });
      if (!key) return "NOT_FOUND";
      if (key.isActive === isActive && (isActive ? !key.revokedAt : Boolean(key.revokedAt))) {
        return "UPDATED";
      }
      if (isActive) {
        const activeCount = await tx.whatsappApiKey.count({
          where: { userId, isActive: true, revokedAt: null, id: { not: keyId } },
        });
        if (activeCount >= activeLimit) return "LIMIT_REACHED";
      }
      await tx.whatsappApiKey.update({
        where: { id: keyId },
        data: {
          isActive,
          revokedAt: isActive ? null : new Date(),
        },
      });
      return "UPDATED";
    });
  }

  findAuthenticatedKey(keyHash: string) {
    return this.prisma.whatsappApiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            whatsappApiAccess: true,
          },
        },
      },
    });
  }

  touchKey(keyId: string) {
    return this.prisma.whatsappApiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    });
  }

  async reserveMonthlyMessage(userId: string): Promise<{
    allowed: boolean;
    limit: number;
    used: number;
  }> {
    const periodStart = currentUtcMonth();
    return this.prisma.$transaction(async (tx) => {
      const access = await tx.whatsappApiAccess.findUnique({ where: { userId } });
      if (!access?.isEnabled || access.monthlyLimit <= 0) {
        return { allowed: false, limit: access?.monthlyLimit ?? 0, used: 0 };
      }

      await tx.whatsappApiUsage.upsert({
        where: { userId_periodStart: { userId, periodStart } },
        create: { userId, periodStart },
        update: {},
      });
      const reserved = await tx.whatsappApiUsage.updateMany({
        where: {
          userId,
          periodStart,
          sentCount: { lt: access.monthlyLimit },
        },
        data: { sentCount: { increment: 1 } },
      });
      const usage = await tx.whatsappApiUsage.findUniqueOrThrow({
        where: { userId_periodStart: { userId, periodStart } },
      });
      return {
        allowed: reserved.count === 1,
        limit: access.monthlyLimit,
        used: usage.sentCount,
      };
    });
  }

  releaseFailedMessage(userId: string) {
    const periodStart = currentUtcMonth();
    return this.prisma.whatsappApiUsage.updateMany({
      where: { userId, periodStart, sentCount: { gt: 0 } },
      data: {
        sentCount: { decrement: 1 },
        failedCount: { increment: 1 },
      },
    });
  }
}
