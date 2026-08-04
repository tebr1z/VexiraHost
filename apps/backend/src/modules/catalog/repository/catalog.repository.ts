import { Injectable } from "@nestjs/common";
import type { ProductCategory } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCatalogCategories() {
    return this.prisma.catalogCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findCatalogCategoryBySlugOrId(slugOrId: string) {
    return this.prisma.catalogCategory.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
        isActive: true,
      },
    });
  }

  findActiveProducts(opts?: { category?: ProductCategory; catalogCategoryId?: string }) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(opts?.category ? { category: opts.category } : {}),
        ...(opts?.catalogCategoryId ? { catalogCategoryId: opts.catalogCategoryId } : {}),
      },
      include: { prices: true, catalogCategory: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findSellableHostingPlanSlugs() {
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

  findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug, isActive: true },
      include: { prices: true, catalogCategory: true },
    });
  }
}
