import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

import {
  CreateHostingPlanDto,
  CreateProductDto,
  CreateServerPlanDto,
  UpdateHostingPlanDto,
  UpdateProductDto,
  UpdateServerPlanDto,
} from "../dto";
import { AdminCatalogService } from "../service/admin-catalog.service";

@Controller("admin")
@UseGuards(RolesGuard)
export class AdminCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  @Get("hosting/plans")
  @Roles(UserRole.ADMIN)
  listHostingPlans() {
    return this.catalogService.listHostingPlans();
  }

  @Post("hosting/plans")
  @Roles(UserRole.ADMIN)
  createHostingPlan(@Body() dto: CreateHostingPlanDto) {
    return this.catalogService.createHostingPlan(dto);
  }

  @Get("hosting/plans/:id")
  @Roles(UserRole.ADMIN)
  getHostingPlan(@Param("id") id: string) {
    return this.catalogService.getHostingPlan(id);
  }

  @Patch("hosting/plans/:id")
  @Roles(UserRole.ADMIN)
  updateHostingPlan(@Param("id") id: string, @Body() dto: UpdateHostingPlanDto) {
    return this.catalogService.updateHostingPlan(id, dto);
  }

  @Delete("hosting/plans/:id")
  @Roles(UserRole.ADMIN)
  deleteHostingPlan(@Param("id") id: string) {
    return this.catalogService.deleteHostingPlan(id);
  }

  @Get("servers/plans")
  @Roles(UserRole.ADMIN)
  listServerPlans() {
    return this.catalogService.listServerPlans();
  }

  @Post("servers/plans")
  @Roles(UserRole.ADMIN)
  createServerPlan(@Body() dto: CreateServerPlanDto) {
    return this.catalogService.createServerPlan(dto);
  }

  @Get("servers/plans/:id")
  @Roles(UserRole.ADMIN)
  getServerPlan(@Param("id") id: string) {
    return this.catalogService.getServerPlan(id);
  }

  @Patch("servers/plans/:id")
  @Roles(UserRole.ADMIN)
  updateServerPlan(@Param("id") id: string, @Body() dto: UpdateServerPlanDto) {
    return this.catalogService.updateServerPlan(id, dto);
  }

  @Delete("servers/plans/:id")
  @Roles(UserRole.ADMIN)
  deleteServerPlan(@Param("id") id: string) {
    return this.catalogService.deleteServerPlan(id);
  }

  @Get("products")
  @Roles(UserRole.ADMIN)
  listProducts() {
    return this.catalogService.listProducts();
  }

  @Post("products")
  @Roles(UserRole.ADMIN)
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Get("products/:id")
  @Roles(UserRole.ADMIN)
  getProduct(@Param("id") id: string) {
    return this.catalogService.getProduct(id);
  }

  @Patch("products/:id")
  @Roles(UserRole.ADMIN)
  updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.updateProduct(id, dto);
  }

  @Delete("products/:id")
  @Roles(UserRole.ADMIN)
  deleteProduct(@Param("id") id: string) {
    return this.catalogService.deleteProduct(id);
  }
}
