import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { CreateCatalogCategoryDto, UpdateCatalogCategoryDto } from "../dto/catalog-category.dto";
import { AdminCatalogCategoryService } from "../service/admin-catalog-category.service";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/catalog-categories")
@UseGuards(RolesGuard)
export class AdminCatalogCategoryController {
  constructor(private readonly categoryService: AdminCatalogCategoryService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  list() {
    return this.categoryService.list();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCatalogCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  get(@Param("id") id: string) {
    return this.categoryService.get(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateCatalogCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.categoryService.delete(id);
  }
}
