import { Injectable } from "@nestjs/common";
import type { Campaign, CampaignStatus, Prisma, User } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import { generateSecureToken } from "@/utils/crypto.util";

@Injectable()
export class MarketingRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCampaigns() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  findCampaignById(id: string) {
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  createCampaign(data: {
    subject: string;
    previewText?: string | null;
    bodyHtml: string;
    bodyText?: string | null;
  }) {
    return this.prisma.campaign.create({
      data: {
        subject: data.subject.trim(),
        previewText: data.previewText?.trim() || null,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText?.trim() || null,
      },
    });
  }

  updateCampaign(id: string, data: Prisma.CampaignUpdateInput) {
    return this.prisma.campaign.update({ where: { id }, data });
  }

  deleteCampaign(id: string) {
    return this.prisma.campaign.delete({ where: { id } });
  }

  setCampaignStatus(
    id: string,
    status: CampaignStatus,
    counts?: Partial<Pick<Campaign, "recipientCount" | "successCount" | "failCount" | "sentAt">>,
  ) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        status,
        ...counts,
      },
    });
  }

  listMarketingRecipients() {
    return this.prisma.user.findMany({
      where: {
        marketingOptIn: true,
        status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
        role: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        unsubscribeToken: true,
      },
    });
  }

  countMarketingSubscribers() {
    return this.prisma.user.count({
      where: {
        marketingOptIn: true,
        status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
        role: "CUSTOMER",
      },
    });
  }

  countMarketingUnsubscribed() {
    return this.prisma.user.count({
      where: {
        marketingOptIn: false,
        role: "CUSTOMER",
      },
    });
  }

  listCustomersForMarketing(filter: "subscribed" | "unsubscribed" | "all" = "all", q?: string) {
    const query = q?.trim().toLowerCase();
    return this.prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(filter === "subscribed" ? { marketingOptIn: true } : {}),
        ...(filter === "unsubscribed" ? { marketingOptIn: false } : {}),
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
        status: true,
        marketingOptIn: true,
        marketingOptInAt: true,
        createdAt: true,
      },
      orderBy: [{ marketingOptIn: "desc" }, { email: "asc" }],
    });
  }

  findCustomerById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, role: "CUSTOMER" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        marketingOptIn: true,
        marketingOptInAt: true,
        unsubscribeToken: true,
        createdAt: true,
      },
    });
  }

  async setMarketingOptIn(userId: string, marketingOptIn: boolean) {
    const existing = await this.findCustomerById(userId);
    if (!existing) return null;

    let unsubscribeToken = existing.unsubscribeToken;
    if (marketingOptIn && !unsubscribeToken) {
      unsubscribeToken = generateSecureToken(24);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        marketingOptIn,
        marketingOptInAt: new Date(),
        ...(unsubscribeToken ? { unsubscribeToken } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        marketingOptIn: true,
        marketingOptInAt: true,
        createdAt: true,
      },
    });
  }

  findByUnsubscribeToken(token: string) {
    return this.prisma.user.findFirst({
      where: { unsubscribeToken: token },
      select: {
        id: true,
        email: true,
        marketingOptIn: true,
        unsubscribeToken: true,
      },
    });
  }

  async unsubscribeByToken(token: string): Promise<User | null> {
    const user = await this.findByUnsubscribeToken(token);
    if (!user) return null;
    if (!user.marketingOptIn) {
      return this.prisma.user.findUnique({ where: { id: user.id } });
    }
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        marketingOptIn: false,
        marketingOptInAt: new Date(),
      },
    });
  }

  ensureUnsubscribeToken(userId: string, existing?: string | null) {
    if (existing) return Promise.resolve(existing);
    const token = generateSecureToken(24);
    return this.prisma.user
      .update({
        where: { id: userId },
        data: { unsubscribeToken: token },
        select: { unsubscribeToken: true },
      })
      .then((row) => row.unsubscribeToken as string);
  }
}
