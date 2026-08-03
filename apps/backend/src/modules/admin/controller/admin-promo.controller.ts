import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { CreatePromoCodeDto, UpdatePromoCodeDto } from "../dto/promo-code.dto";
import { AdminPromoService } from "../service/admin-promo.service";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/promo-codes")
@UseGuards(RolesGuard)
export class AdminPromoController {
  constructor(private readonly promoService: AdminPromoService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list() {
    return this.promoService.list();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePromoCodeDto) {
    return this.promoService.create(dto);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  get(@Param("id") id: string) {
    return this.promoService.get(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.promoService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.promoService.delete(id);
  }
}
