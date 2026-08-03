import { Injectable } from "@nestjs/common";
import type { Prisma, ProductCategory } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class AdminCatalogCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.catalogCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.catalogCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.catalogCategory.findUnique({ where: { slug } });
  }

  create(data: {
    slug: string;
    name: string;
    names?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    sortOrder?: number;
    isActive?: boolean;
    systemType?: ProductCategory | null;
  }) {
    return this.prisma.catalogCategory.create({
      data: {
        slug: data.slug,
        name: data.name,
        names: data.names === undefined ? undefined : data.names,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        systemType: data.systemType ?? null,
      },
      include: { _count: { select: { products: true } } },
    });
  }

  update(id: string, data: Prisma.CatalogCategoryUpdateInput) {
    return this.prisma.catalogCategory.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.catalogCategory.delete({ where: { id } });
  }
}
