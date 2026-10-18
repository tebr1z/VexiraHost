import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { CreateTldPricingDto, UpdateTldPricingDto } from "../dto/tld-pricing.dto";
import { AdminDomainsService } from "../service/admin-domains.service";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/domains")
@UseGuards(RolesGuard)
export class AdminDomainsController {
  constructor(private readonly domainsService: AdminDomainsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listDomains(@Query("q") q?: string) {
    return this.domainsService.listDomains(q);
  }

  @Get("tlds")
  @Roles(UserRole.ADMIN)
  listTlds() {
    return this.domainsService.listTlds();
  }

  @Post("tlds")
  @Roles(UserRole.ADMIN)
  createTld(@Body() dto: CreateTldPricingDto) {
    return this.domainsService.createTld(dto);
  }

  @Get("tlds/:id")
  @Roles(UserRole.ADMIN)
  getTld(@Param("id") id: string) {
    return this.domainsService.getTld(id);
  }

  @Patch("tlds/:id")
  @Roles(UserRole.ADMIN)
  updateTld(@Param("id") id: string, @Body() dto: UpdateTldPricingDto) {
    return this.domainsService.updateTld(id, dto);
  }

  @Delete("tlds/:id")
  @Roles(UserRole.ADMIN)
  deleteTld(@Param("id") id: string) {
    return this.domainsService.deleteTld(id);
  }
}
