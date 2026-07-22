import { Injectable } from "@nestjs/common";
import type { ProductCategory } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveProducts(category?: ProductCategory) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      include: { prices: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findSellableHostingPlanSlugs() {
    return this.prisma.hostingPlan.findMany({
      where: {
        isActive: true,
        serverId: { not: null },
        server: { isActive: true },
      },
      select: { slug: true },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug, isActive: true },
      include: { prices: true },
    });
  }

  findActiveCategories(): Promise<{ category: ProductCategory; productCount: number }[]> {
    return this.prisma.product
      .groupBy({
        by: ["category"],
        where: { isActive: true },
        _count: { id: true },
      })
      .then((groups) =>
        groups.map((group) => ({
          category: group.category,
          productCount: group._count.id,
        })),
      );
  }
}
