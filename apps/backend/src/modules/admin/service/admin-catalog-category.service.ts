import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type ProductCategory } from "@prisma/client";

import type {
  CreateCatalogCategoryDto,
  UpdateCatalogCategoryDto,
} from "../dto/catalog-category.dto";
import { AdminCatalogCategoryRepository } from "../repository/admin-catalog-category.repository";

function mapCategory(row: {
  id: string;
  slug: string;
  name: string;
  names: unknown;
  sortOrder: number;
  isActive: boolean;
  systemType: ProductCategory | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
}) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    names: (row.names as Record<string, string> | null) ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    systemType: row.systemType,
    productCount: row._count?.products ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AdminCatalogCategoryService {
  constructor(private readonly repo: AdminCatalogCategoryRepository) {}

  async list() {
    const rows = await this.repo.list();
    return rows.map(mapCategory);
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException("Category not found");
    return mapCategory(row);
  }

  async create(dto: CreateCatalogCategoryDto) {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.repo.findBySlug(slug);
    if (existing) throw new ConflictException(`Category slug "${slug}" already exists`);

    const row = await this.repo.create({
      slug,
      name: dto.name.trim(),
      ...(dto.names !== undefined
        ? { names: dto.names === null ? Prisma.JsonNull : dto.names }
        : {}),
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      systemType: dto.systemType ?? null,
    });
    return mapCategory(row);
  }

  async update(id: string, dto: UpdateCatalogCategoryDto) {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException("Category not found");

    if (dto.slug && dto.slug.trim().toLowerCase() !== current.slug) {
      const clash = await this.repo.findBySlug(dto.slug.trim().toLowerCase());
      if (clash) throw new ConflictException(`Category slug "${dto.slug}" already exists`);
    }

    const row = await this.repo.update(id, {
      ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.names !== undefined
        ? { names: dto.names === null ? Prisma.JsonNull : dto.names }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.systemType !== undefined ? { systemType: dto.systemType } : {}),
    });
    return mapCategory(row);
  }

  async delete(id: string) {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException("Category not found");
    if ((current._count?.products ?? 0) > 0) {
      throw new BadRequestException("Cannot delete category that still has products");
    }
    await this.repo.delete(id);
    return { deleted: true };
  }
}
