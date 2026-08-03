import { Injectable } from "@nestjs/common";
import type { NotificationType, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    reference?: string | null;
    href?: string | null;
    meta?: Prisma.InputJsonValue;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        reference: data.reference ?? null,
        href: data.href ?? null,
        meta: data.meta,
      },
    });
  }

  listForUser(userId: string, take = 30) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
