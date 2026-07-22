import { Injectable, NotFoundException } from "@nestjs/common";
import type { CmsPageSection } from "@prisma/client";

import { CmsRepository } from "../repository/cms.repository";
import { resolveContentDeep, resolveI18nText, type I18nText } from "../utils/cms-i18n.util";

function mapSectionAdmin(section: CmsPageSection) {
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

@Injectable()
export class CmsService {
  constructor(private readonly repository: CmsRepository) {}

  async getPublicPage(slug: string, locale = "tr") {
    const page = await this.repository.findActivePageBySlug(slug);
    if (!page) return null;

    return {
      slug: page.slug,
      title: resolveI18nText(page.title, locale),
      sections: page.sections.map((section) => ({
        id: section.id,
        key: section.key,
        type: section.type,
        content: resolveContentDeep(section.content, locale) as Record<string, unknown>,
        design: section.design as Record<string, unknown>,
      })),
    };
  }

  listAdminPages() {
    return this.repository.findAllPages().then((pages) =>
      pages.map((page) => ({
        id: page.id,
        slug: page.slug,
        title: page.title as I18nText,
        isActive: page.isActive,
        sectionCount: page.sections.length,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })),
    );
  }

  async getAdminPage(slug: string) {
    const page = await this.repository.findPageBySlug(slug);
    if (!page) throw new NotFoundException("Page not found");

    return {
      id: page.id,
      slug: page.slug,
      title: page.title as I18nText,
      isActive: page.isActive,
      sections: page.sections.map(mapSectionAdmin),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }
}
