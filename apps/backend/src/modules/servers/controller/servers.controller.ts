import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ServerType } from "@prisma/client";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import { ListPlansQueryDto, ProvisionServerDto, ServerPowerDto } from "../dto";
import { ServersService } from "../service/servers.service";

@Controller("servers")
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Public()
  @Get("plans")
  listPlans(@Query() query: ListPlansQueryDto) {
    return this.serversService.listPlans(query.type as ServerType | undefined);
  }

  @Get()
  list(@User() user: AuthUser) {
    return this.serversService.listForUser(user.id);
  }

  @Post("provision")
  provision(@Body() dto: ProvisionServerDto, @User() user: AuthUser) {
    return this.serversService.provision(user.id, dto);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.serversService.getForUser(id, user.id);
  }

  @Get(":id/metrics")
  getMetrics(@Param("id") id: string, @User() user: AuthUser) {
    return this.serversService.getMetrics(id, user.id);
  }

  @Get(":id/power-logs")
  getPowerLogs(@Param("id") id: string, @User() user: AuthUser) {
    return this.serversService.getPowerLogs(id, user.id);
  }

  @Post(":id/power")
  power(@Param("id") id: string, @Body() dto: ServerPowerDto, @User() user: AuthUser) {
    return this.serversService.powerAction(id, user.id, dto);
  }
}
