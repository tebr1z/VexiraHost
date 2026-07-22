import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

import {
  CreateCmsPageDto,
  CreateCmsSectionDto,
  ReorderCmsSectionsDto,
  UpdateCmsPageDto,
  UpdateCmsSectionDto,
} from "../dto/cms.dto";
import { AdminCmsService } from "../service/admin-cms.service";

@Controller("admin/cms")
@UseGuards(RolesGuard)
export class AdminCmsController {
  constructor(private readonly adminCmsService: AdminCmsService) {}

  @Get("pages")
  @Roles(UserRole.ADMIN)
  listPages() {
    return this.adminCmsService.listPages();
  }

  @Get("pages/:slug")
  @Roles(UserRole.ADMIN)
  getPage(@Param("slug") slug: string) {
    return this.adminCmsService.getPage(slug);
  }

  @Post("pages")
  @Roles(UserRole.ADMIN)
  createPage(@Body() dto: CreateCmsPageDto) {
    return this.adminCmsService.createPage(dto);
  }

  @Patch("pages/:slug")
  @Roles(UserRole.ADMIN)
  updatePage(@Param("slug") slug: string, @Body() dto: UpdateCmsPageDto) {
    return this.adminCmsService.updatePage(slug, dto);
  }

  @Delete("pages/:slug")
  @Roles(UserRole.ADMIN)
  deletePage(@Param("slug") slug: string) {
    return this.adminCmsService.deletePage(slug);
  }

  @Post("pages/:slug/sections")
  @Roles(UserRole.ADMIN)
  createSection(@Param("slug") slug: string, @Body() dto: CreateCmsSectionDto) {
    return this.adminCmsService.createSection(slug, dto);
  }

  @Patch("sections/:id")
  @Roles(UserRole.ADMIN)
  updateSection(@Param("id") id: string, @Body() dto: UpdateCmsSectionDto) {
    return this.adminCmsService.updateSection(id, dto);
  }

  @Delete("sections/:id")
  @Roles(UserRole.ADMIN)
  deleteSection(@Param("id") id: string) {
    return this.adminCmsService.deleteSection(id);
  }

  @Put("pages/:slug/sections/reorder")
  @Roles(UserRole.ADMIN)
  reorderSections(@Param("slug") slug: string, @Body() dto: ReorderCmsSectionsDto) {
    return this.adminCmsService.reorderSections(slug, dto);
  }
}
