import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import { ProvisionAddonDto } from "../dto";
import { LicensesService } from "../service/licenses.service";

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

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.licensesService.getForUser(id, user.id);
  }
}
