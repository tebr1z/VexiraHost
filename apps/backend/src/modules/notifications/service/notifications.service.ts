import { Injectable } from "@nestjs/common";
import type { NotificationType, Prisma } from "@prisma/client";

import { NotificationsRepository } from "../repository/notifications.repository";

function mapNotification(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  reference: string | null;
  href: string | null;
  meta: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    reference: n.reference,
    href: n.href,
    meta: n.meta,
    readAt: n.readAt,
    createdAt: n.createdAt,
    unread: n.readAt == null,
  };
}

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    reference?: string | null;
    href?: string | null;
    meta?: Prisma.InputJsonValue;
  }) {
    const created = await this.notificationsRepository.create(input);
    return mapNotification(created);
  }

  async listForUser(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.notificationsRepository.listForUser(userId),
      this.notificationsRepository.unreadCount(userId),
    ]);
    return {
      unreadCount,
      items: items.map(mapNotification),
    };
  }

  async unreadCount(userId: string) {
    return { unreadCount: await this.notificationsRepository.unreadCount(userId) };
  }

  async markRead(userId: string, id: string) {
    await this.notificationsRepository.markRead(userId, id);
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string) {
    await this.notificationsRepository.markAllRead(userId);
    return this.unreadCount(userId);
  }
}
