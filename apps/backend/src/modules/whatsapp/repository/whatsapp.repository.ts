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

  createMessageLog(data: {
    toPhone: string;
    userId?: string | null;
    apiKeyId?: string | null;
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
