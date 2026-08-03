import { Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import { HostingPanel } from "@prisma/client";
import type { AuthUser } from "@vexira/types";
import type { Request, Response } from "express";

import { ListHostingPlansQueryDto, PanelLoginDto, ProvisionHostingDto } from "../dto";
import { HostingService } from "../service/hosting.service";
import { PanelSessionService } from "../service/panel-session.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { getClientIp } from "@/utils/client-ip.util";

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
    const result = await this.panelSession.resolveOpenTicket(ticket, getClientIp(req));
    if (typeof result === "string") {
      res.redirect(302, result);
      return;
    }
    res.type("html").send(result.html);
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
  panelLogin(@Param("id") id: string, @User() user: AuthUser, @Body() dto: PanelLoginDto) {
    return this.hostingService.createPanelOpenUrl(id, user.id, dto.clientIp);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.hostingService.getForUser(id, user.id);
  }
}
