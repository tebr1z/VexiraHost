import { Injectable } from "@nestjs/common";
import type { CmsSectionType, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class CmsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPageBySlug(slug: string) {
    return this.prisma.cmsPage.findUnique({
      where: { slug },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  findActivePageBySlug(slug: string) {
    return this.prisma.cmsPage.findFirst({
      where: { slug, isActive: true },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  findAllPages() {
    return this.prisma.cmsPage.findMany({
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { slug: "asc" },
    });
  }

  findPageById(id: string) {
    return this.prisma.cmsPage.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  createPage(data: Prisma.CmsPageCreateInput) {
    return this.prisma.cmsPage.create({ data });
  }

  updatePage(id: string, data: Prisma.CmsPageUpdateInput) {
    return this.prisma.cmsPage.update({ where: { id }, data });
  }

  deletePage(id: string) {
    return this.prisma.cmsPage.delete({ where: { id } });
  }

  findSectionById(id: string) {
    return this.prisma.cmsPageSection.findUnique({ where: { id } });
  }

  createSection(data: Prisma.CmsPageSectionCreateInput) {
    return this.prisma.cmsPageSection.create({ data });
  }

  updateSection(id: string, data: Prisma.CmsPageSectionUpdateInput) {
    return this.prisma.cmsPageSection.update({ where: { id }, data });
  }

  deleteSection(id: string) {
    return this.prisma.cmsPageSection.delete({ where: { id } });
  }

  reorderSections(pageId: string, sectionIds: string[]) {
    return this.prisma.$transaction(
      sectionIds.map((id, index) =>
        this.prisma.cmsPageSection.update({
          where: { id, pageId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  countSectionsByType(pageId: string, type: CmsSectionType) {
    return this.prisma.cmsPageSection.count({ where: { pageId, type } });
  }
}
