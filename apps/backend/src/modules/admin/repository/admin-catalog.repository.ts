import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class AdminCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listHostingPlans() {
    return this.prisma.hostingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        server: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            panel: true,
            isActive: true,
            maxAccounts: true,
            accountCount: true,
          },
        },
        planServers: {
          orderBy: { priority: "asc" },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                ipAddress: true,
                panel: true,
                isActive: true,
                maxAccounts: true,
                accountCount: true,
              },
            },
          },
        },
        _count: { select: { accounts: true } },
      },
    });
  }

  findHostingPlanById(id: string) {
    return this.prisma.hostingPlan.findUnique({
      where: { id },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            panel: true,
            isActive: true,
            maxAccounts: true,
            accountCount: true,
          },
        },
        planServers: {
          orderBy: { priority: "asc" },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                ipAddress: true,
                panel: true,
                isActive: true,
                maxAccounts: true,
                accountCount: true,
              },
            },
          },
        },
        _count: { select: { accounts: true } },
      },
    });
  }

  findHostingPlanBySlug(slug: string) {
    return this.prisma.hostingPlan.findUnique({ where: { slug } });
  }

  createHostingPlan(data: Prisma.HostingPlanCreateInput) {
    return this.prisma.hostingPlan.create({ data });
  }

  updateHostingPlan(id: string, data: Prisma.HostingPlanUpdateInput) {
    return this.prisma.hostingPlan.update({ where: { id }, data });
  }

  async replacePlanServers(planId: string, serverIds: string[]) {
    await this.prisma.hostingPlanServer.deleteMany({ where: { planId } });
    if (serverIds.length === 0) return;
    await this.prisma.hostingPlanServer.createMany({
      data: serverIds.map((serverId, index) => ({
        planId,
        serverId,
        priority: index,
        isActive: true,
      })),
    });
  }

  deleteHostingPlan(id: string) {
    return this.prisma.hostingPlan.delete({ where: { id } });
  }

  listServerPlans() {
    return this.prisma.serverPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { servers: true } } },
    });
  }

  findServerPlanById(id: string) {
    return this.prisma.serverPlan.findUnique({
      where: { id },
      include: { _count: { select: { servers: true } } },
    });
  }

  findServerPlanBySlug(slug: string) {
    return this.prisma.serverPlan.findUnique({ where: { slug } });
  }

  createServerPlan(data: Prisma.ServerPlanCreateInput) {
    return this.prisma.serverPlan.create({ data });
  }

  updateServerPlan(id: string, data: Prisma.ServerPlanUpdateInput) {
    return this.prisma.serverPlan.update({ where: { id }, data });
  }

  deleteServerPlan(id: string) {
    return this.prisma.serverPlan.delete({ where: { id } });
  }

  listProducts() {
    return this.prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        prices: true,
        _count: { select: { orderItems: true } },
      },
    });
  }

  findProductById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        prices: true,
        _count: { select: { orderItems: true } },
      },
    });
  }

  findProductBySlug(slug: string) {
    return this.prisma.product.findUnique({ where: { slug } });
  }

  createProduct(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  replaceProductPrices(
    productId: string,
    prices: Array<{
      currency: "USD" | "EUR" | "AZN";
      period: "MONTHLY" | "YEARLY";
      originalPrice: number;
      salePrice: number;
    }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.productPrice.deleteMany({ where: { productId } });
      if (prices.length === 0) return;
      await tx.productPrice.createMany({
        data: prices.map((price) => ({
          productId,
          currency: price.currency,
          period: price.period,
          originalPrice: price.originalPrice,
          salePrice: price.salePrice,
        })),
      });
    });
  }

  findHostingServerById(id: string) {
    return this.prisma.hostingServer.findUnique({ where: { id } });
  }
}
