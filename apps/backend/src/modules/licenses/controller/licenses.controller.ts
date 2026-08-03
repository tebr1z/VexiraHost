import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import { ProvisionAddonDto } from "../dto";
import { LicensesService } from "../service/licenses.service";

import { User } from "@/decorators/user.decorator";

@Controller("licenses")
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  list(@User() user: AuthUser) {
    return this.licensesService.listForUser(user.id);
  }

  @Post("provision")
  provision(@Body() dto: ProvisionAddonDto, @User() user: AuthUser) {
    return this.licensesService.provision(user.id, dto);
  }

  @Post("claim-free/:productId")
  claimFree(@Param("productId") productId: string, @User() user: AuthUser) {
    return this.licensesService.claimFreeProduct(user.id, productId);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.licensesService.getForUser(id, user.id);
  }
}
