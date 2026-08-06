import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type {
  CreateCmsPageDto,
  CreateCmsSectionDto,
  ReorderCmsSectionsDto,
  UpdateCmsPageDto,
  UpdateCmsSectionDto,
} from "../dto/cms.dto";
import { CmsRepository } from "../repository/cms.repository";
import { toJsonValue } from "../utils/cms-i18n.util";

import { CmsService } from "./cms.service";

@Injectable()
export class AdminCmsService {
  constructor(
    private readonly repository: CmsRepository,
    private readonly cmsService: CmsService,
  ) {}

  listPages() {
    return this.cmsService.listAdminPages();
  }

  getPage(slug: string) {
    return this.cmsService.getAdminPage(slug);
  }

  async createPage(dto: CreateCmsPageDto) {
    const existing = await this.repository.findPageBySlug(dto.slug);
    if (existing) throw new ConflictException("Page slug already exists");

    if (dto.pathSegment) {
      const pathConflict = await this.repository.findPageByPathSegment(dto.pathSegment);
      if (pathConflict) throw new ConflictException("Path segment already in use");
    }

    const page = await this.repository.createPage({
      slug: dto.slug,
      title: toJsonValue(dto.title),
      parentSlug: dto.parentSlug ?? null,
      pathSegment: dto.pathSegment ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    if (dto.template === "license-catalog") {
      await this.createLicenseCatalogTemplate(page.id, dto);
    }

    return this.cmsService.getAdminPage(page.slug);
  }

  private async createLicenseCatalogTemplate(pageId: string, dto: CreateCmsPageDto): Promise<void> {
    const title = dto.title;
    await this.repository.createSection({
      page: { connect: { id: pageId } },
      key: "hero",
      type: "HERO",
      sortOrder: 0,
      isActive: true,
      design: toJsonValue({ variant: "gradient", padding: "lg" }),
      content: toJsonValue({
        title,
        subtitle: {
          tr: "Orijinal lisans — anında teslim ve panelden yönetim.",
          en: "Genuine license — instant delivery and panel management.",
          ru: "Оригинальная лицензия — мгновенная доставка и управление в панели.",
          az: "Orijinal lisenziya — ani çatdırılma və paneldən idarə.",
        },
        ctaPrimary: {
          tr: "Paketleri gör",
          en: "See plans",
          ru: "Смотреть тарифы",
          az: "Paketlara bax",
        },
        ctaPrimaryHref: "#license-products",
        ctaSecondary: {
          tr: "Tüm lisanslar",
          en: "All licenses",
          ru: "Все лицензии",
          az: "Bütün lisenziyalar",
        },
        ctaSecondaryHref: "/licenses",
      }),
    });

    const catalogContent: Record<string, unknown> = {
      template: "catalog",
      categorySlug: "license",
      anchorId: "license-products",
      title,
      subtitle: {
        tr: "İhtiyacınıza uygun lisansı seçin.",
        en: "Choose the license that fits your needs.",
        ru: "Выберите подходящую лицензию.",
        az: "Ehtiyacınıza uyğun lisenziyanı seçin.",
      },
    };
    if (dto.productSlugs?.length) {
      catalogContent.productSlugs = dto.productSlugs;
    }

    await this.repository.createSection({
      page: { connect: { id: pageId } },
      key: "products",
      type: "CUSTOM",
      sortOrder: 1,
      isActive: true,
      design: toJsonValue({ padding: "lg", columns: 3 }),
      content: toJsonValue(catalogContent),
    });
  }

  async updatePage(slug: string, dto: UpdateCmsPageDto) {
    const page = await this.repository.findPageBySlug(slug);
    if (!page) throw new NotFoundException("Page not found");

    if (dto.slug && dto.slug !== page.slug) {
      const conflict = await this.repository.findPageBySlug(dto.slug);
      if (conflict) throw new ConflictException("Page slug already exists");
    }

    const data: Prisma.CmsPageUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.title !== undefined) data.title = toJsonValue(dto.title);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.parentSlug !== undefined) data.parentSlug = dto.parentSlug;
    if (dto.pathSegment !== undefined) data.pathSegment = dto.pathSegment;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    await this.repository.updatePage(page.id, data);
    return this.cmsService.getAdminPage(dto.slug ?? page.slug);
  }

  async deletePage(slug: string) {
    const page = await this.repository.findPageBySlug(slug);
    if (!page) throw new NotFoundException("Page not found");
    await this.repository.deletePage(page.id);
    return { message: "Page deleted" };
  }

  async createSection(pageSlug: string, dto: CreateCmsSectionDto) {
    const page = await this.repository.findPageBySlug(pageSlug);
    if (!page) throw new NotFoundException("Page not found");

    const section = await this.repository.createSection({
      page: { connect: { id: page.id } },
      key: dto.key,
      type: dto.type,
      content: toJsonValue(dto.content),
      design: toJsonValue(dto.design ?? {}),
      sortOrder: dto.sortOrder ?? page.sections.length,
      isActive: dto.isActive ?? true,
    });

    return {
      id: section.id,
      pageId: section.pageId,
      key: section.key,
      type: section.type,
      sortOrder: section.sortOrder,
      isActive: section.isActive,
      content: section.content as Record<string, unknown>,
      design: section.design as Record<string, unknown>,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }

  async updateSection(sectionId: string, dto: UpdateCmsSectionDto) {
    const section = await this.repository.findSectionById(sectionId);
    if (!section) throw new NotFoundException("Section not found");

    const data: Prisma.CmsPageSectionUpdateInput = {};
    if (dto.key !== undefined) data.key = dto.key;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.content !== undefined) data.content = toJsonValue(dto.content);
    if (dto.design !== undefined) data.design = toJsonValue(dto.design);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.repository.updateSection(sectionId, data);
    return {
      id: updated.id,
      pageId: updated.pageId,
      key: updated.key,
      type: updated.type,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      content: updated.content as Record<string, unknown>,
      design: updated.design as Record<string, unknown>,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteSection(sectionId: string) {
    const section = await this.repository.findSectionById(sectionId);
    if (!section) throw new NotFoundException("Section not found");
    await this.repository.deleteSection(sectionId);
    return { message: "Section deleted" };
  }

  async reorderSections(pageSlug: string, dto: ReorderCmsSectionsDto) {
    const page = await this.repository.findPageBySlug(pageSlug);
    if (!page) throw new NotFoundException("Page not found");
    await this.repository.reorderSections(page.id, dto.sectionIds);
    return this.cmsService.getAdminPage(pageSlug);
  }
}
