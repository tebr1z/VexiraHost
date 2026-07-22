import { Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";

import { HostingPanel } from "@prisma/client";

import type { Request, Response } from "express";

import { Public } from "@/decorators/auth.decorators";

import { User } from "@/decorators/user.decorator";

import type { AuthUser } from "@vexira/types";

import { getClientIp } from "@/utils/client-ip.util";

import { ListHostingPlansQueryDto, PanelLoginDto, ProvisionHostingDto } from "../dto";

import { HostingService } from "../service/hosting.service";
import { PanelSessionService } from "../service/panel-session.service";

@Controller("hosting")
export class HostingController {
  constructor(
    private readonly hostingService: HostingService,
    private readonly panelSession: PanelSessionService,
  ) {}

  @Public()
  @Get("plans")
  listPlans(@Query() query: ListHostingPlansQueryDto) {
    return this.hostingService.listPlans(query.panel as HostingPanel | undefined);
  }

  @Public()
  @Get("panel-open/:ticket")
  async panelOpen(
    @Param("ticket") ticket: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const loginUrl = await this.panelSession.resolveOpenTicket(ticket, getClientIp(req));
    res.redirect(302, loginUrl);
  }

  @Get()
  list(@User() user: AuthUser) {
    return this.hostingService.listForUser(user.id);
  }

  @Post("provision")
  provision(@Body() dto: ProvisionHostingDto, @User() user: AuthUser) {
    return this.hostingService.provision(user.id, dto, { requirePaidOrder: true });
  }

  @Post(":id/retry-provision")
  retryProvision(@Param("id") id: string, @User() user: AuthUser) {
    return this.hostingService.retryProvision(id, user.id);
  }

  @Post(":id/sync-panel-info")
  syncPanelInfo(@Param("id") id: string, @User() user: AuthUser) {
    return this.hostingService.syncPanelInfo(id, user.id);
  }

  @Post(":id/panel-login")
  panelLogin(
    @Param("id") id: string,
    @User() user: AuthUser,
    @Body() dto: PanelLoginDto,
  ) {
    return this.hostingService.createPanelOpenUrl(id, user.id, dto.clientIp);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.hostingService.getForUser(id, user.id);
  }
}
