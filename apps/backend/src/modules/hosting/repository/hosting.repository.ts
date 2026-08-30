import { Injectable } from "@nestjs/common";
import type {
  HostingManagementMode,
  HostingPanel,
  ManualServiceCategory,
  ServiceStatus,
} from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class HostingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlans(panel?: HostingPanel) {
    return this.prisma.hostingPlan.findMany({
      where: {
        isActive: true,
        ...(panel ? { panel } : {}),
        OR: [
          { server: { isActive: true } },
          {
            planServers: {
              some: { isActive: true, server: { isActive: true } },
            },
          },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  findPlanBySlug(slug: string) {
    return this.prisma.hostingPlan.findFirst({
      where: {
        slug,
        isActive: true,
        OR: [
          { server: { isActive: true } },
          {
            planServers: {
              some: { isActive: true, server: { isActive: true } },
            },
          },
        ],
      },
      include: {
        server: true,
        planServers: {
          where: { isActive: true },
          orderBy: { priority: "asc" },
          include: { server: true },
        },
      },
    });
  }

  /** Admin/internal: plan by slug regardless of server assignment. */
  findPlanBySlugAny(slug: string) {
    return this.prisma.hostingPlan.findFirst({
      where: { slug, isActive: true },
      include: {
        server: true,
        planServers: {
          where: { isActive: true },
          orderBy: { priority: "asc" },
          include: { server: true },
        },
      },
    });
  }

  findSellablePlanSlugs() {
    return this.prisma.hostingPlan.findMany({
      where: {
        isActive: true,
        OR: [
          { server: { isActive: true } },
          {
            planServers: {
              some: { isActive: true, server: { isActive: true } },
            },
          },
        ],
      },
      select: { slug: true },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.hostingAccount.findMany({
      where: { userId },
      include: { plan: true, server: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.hostingAccount.findFirst({
      where: { id, userId },
      include: { plan: true, server: true },
    });
  }

  findByPrimaryDomainOwnedByOther(userId: string, primaryDomain: string) {
    return this.prisma.hostingAccount.findFirst({
      where: {
        primaryDomain: primaryDomain.toLowerCase(),
        userId: { not: userId },
      },
    });
  }

  findByUsername(username: string) {
    return this.prisma.hostingAccount.findUnique({
      where: { username: username.toLowerCase() },
    });
  }

  createAccount(data: {
    userId: string;
    planId: string;
    serverId?: string;
    orderId?: string;
    primaryDomain: string;
    username: string;
    panel: HostingPanel;
    managementMode?: HostingManagementMode;
    serviceCategory?: ManualServiceCategory;
    status: ServiceStatus;
    panelIp?: string;
    panelUrl?: string;
    panelUsername?: string;
    panelPasswordEnc?: string;
    panelRef?: string;
    provisionedAt?: Date;
    expiresAt?: Date;
    billingAmount?: number;
    billingCurrency?: string;
    provisionStage?: string | null;
    provisionError?: string | null;
  }) {
    return this.prisma.hostingAccount.create({ data });
  }

  updateAccount(
    id: string,
    data: {
      status?: ServiceStatus;
      serverId?: string;
      panelUrl?: string;
      panelUsername?: string;
      panelPasswordEnc?: string;
      panelRef?: string;
      panelIp?: string;
      expiresAt?: Date;
      provisionedAt?: Date;
      panelSessionTokenEnc?: string | null;
      panelSessionExpiresAt?: Date | null;
      provisionStage?: string | null;
      provisionError?: string | null;
    },
  ) {
    return this.prisma.hostingAccount.update({ where: { id }, data });
  }

  findUserEmail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
  }

  findAccountsWithExpiringSessions(before: Date) {
    return this.prisma.hostingAccount.findMany({
      where: {
        status: "ACTIVE",
        panelSessionExpiresAt: { lte: before },
        server: { isNot: null },
      },
      include: { server: true },
      take: 25,
    });
  }

  findById(id: string) {
    return this.prisma.hostingAccount.findUnique({
      where: { id },
      include: { plan: true, server: true },
    });
  }
}
