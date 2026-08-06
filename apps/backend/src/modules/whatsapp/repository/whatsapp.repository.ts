import { Injectable } from "@nestjs/common";
import type { WhatsappMessageStatus, WhatsappSessionStatus } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

const SESSION_ID = "default";

@Injectable()
export class WhatsappRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureSession() {
    return this.prisma.whatsappSession.upsert({
      where: { id: SESSION_ID },
      create: { id: SESSION_ID, status: "DISCONNECTED" },
      update: {},
    });
  }

  getSession() {
    return this.prisma.whatsappSession.findUnique({ where: { id: SESSION_ID } });
  }

  updateSession(data: {
    status?: WhatsappSessionStatus;
    phoneNumber?: string | null;
    displayName?: string | null;
    lastQrAt?: Date | null;
    lastConnectedAt?: Date | null;
    lastError?: string | null;
  }) {
    return this.prisma.whatsappSession.upsert({
      where: { id: SESSION_ID },
      create: {
        id: SESSION_ID,
        status: data.status ?? "DISCONNECTED",
        phoneNumber: data.phoneNumber ?? null,
        displayName: data.displayName ?? null,
        lastQrAt: data.lastQrAt ?? null,
        lastConnectedAt: data.lastConnectedAt ?? null,
        lastError: data.lastError ?? null,
      },
      update: data,
    });
  }

  ensurePrimaryGatewayAccount() {
    return this.prisma.whatsappGatewayAccount.upsert({
      where: { id: "primary" },
      create: { id: "primary", label: "Primary WhatsApp" },
      update: {},
    });
  }

  listGatewayAccounts() {
    return this.prisma.whatsappGatewayAccount.findMany({
      orderBy: [{ createdAt: "asc" }],
    });
  }

  getGatewayAccount(id: string) {
    return this.prisma.whatsappGatewayAccount.findUnique({ where: { id } });
  }

  createGatewayAccount(label: string) {
    return this.prisma.whatsappGatewayAccount.create({ data: { label } });
  }

  updateGatewayAccount(
    id: string,
    data: {
      label?: string;
      isEnabled?: boolean;
      status?: WhatsappSessionStatus;
      phoneNumber?: string | null;
      displayName?: string | null;
      lastQrAt?: Date | null;
      lastConnectedAt?: Date | null;
      lastError?: string | null;
    },
  ) {
    return this.prisma.whatsappGatewayAccount.update({ where: { id }, data });
  }

  async listEligibleGatewayAccounts(excludeId?: string) {
    return this.prisma.whatsappGatewayAccount.findMany({
      where: {
        isEnabled: true,
        status: "CONNECTED",
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: [{ sentCount: "asc" }, { lastSentAt: "asc" }, { createdAt: "asc" }],
    });
  }

  recordGatewaySuccess(id: string) {
    return this.prisma.whatsappGatewayAccount.update({
      where: { id },
      data: { sentCount: { increment: 1 }, lastSentAt: new Date(), lastError: null },
    });
  }

  recordGatewayFailure(id: string, error: string) {
    return this.prisma.whatsappGatewayAccount.update({
      where: { id },
      data: { failedCount: { increment: 1 }, lastError: error.slice(0, 300) },
    });
  }

  createMessageLog(data: {
    toPhone: string;
    userId?: string | null;
    apiKeyId?: string | null;
    gatewayAccountId?: string | null;
    body: string;
    status: WhatsappMessageStatus;
    error?: string | null;
  }) {
    return this.prisma.whatsappMessageLog.create({ data });
  }

  listRecentMessages(limit = 50) {
    return this.prisma.whatsappMessageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  listUsersForMessaging(q?: string) {
    const query = q?.trim();
    return this.prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });
  }
}
