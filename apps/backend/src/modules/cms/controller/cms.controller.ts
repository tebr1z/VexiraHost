import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";

import { Public } from "@/decorators/auth.decorators";

import { CmsService } from "../service/cms.service";

@Controller("pages")
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Public()
  @Get(":slug")
  async getPage(@Param("slug") slug: string, @Query("locale") locale?: string) {
    const page = await this.cmsService.getPublicPage(slug, locale ?? "tr");
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }
}
