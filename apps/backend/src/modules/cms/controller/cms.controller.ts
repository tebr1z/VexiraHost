import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";

import { CmsService } from "../service/cms.service";

import { Public } from "@/decorators/auth.decorators";

@Controller("pages")
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Public()
  @Get("by-path/:pathSegment")
  async getPageByPath(@Param("pathSegment") pathSegment: string, @Query("locale") locale?: string) {
    const page = await this.cmsService.getPublicPageByPathSegment(pathSegment, locale ?? "tr");
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  @Public()
  @Get("children")
  async listChildPages(@Query("parentSlug") parentSlug: string, @Query("locale") locale?: string) {
    if (!parentSlug?.trim()) throw new NotFoundException("parentSlug is required");
    return this.cmsService.listPublicChildPages(parentSlug.trim(), locale ?? "tr");
  }

  @Public()
  @Get(":slug")
  async getPage(@Param("slug") slug: string, @Query("locale") locale?: string) {
    const page = await this.cmsService.getPublicPage(slug, locale ?? "tr");
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }
}
