import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

import { CreateTldPricingDto, UpdateTldPricingDto } from "../dto/tld-pricing.dto";
import { AdminDomainsService } from "../service/admin-domains.service";

@Controller("admin/domains/tlds")
@UseGuards(RolesGuard)
export class AdminDomainsController {
  constructor(private readonly domainsService: AdminDomainsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  listTlds() {
    return this.domainsService.listTlds();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createTld(@Body() dto: CreateTldPricingDto) {
    return this.domainsService.createTld(dto);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  getTld(@Param("id") id: string) {
    return this.domainsService.getTld(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  updateTld(@Param("id") id: string, @Body() dto: UpdateTldPricingDto) {
    return this.domainsService.updateTld(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  deleteTld(@Param("id") id: string) {
    return this.domainsService.deleteTld(id);
  }
}
