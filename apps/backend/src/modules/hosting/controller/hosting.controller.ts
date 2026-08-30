import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from "@nestjs/common";
import { HostingPanel } from "@prisma/client";
import type { AuthUser } from "@vexira/types";
import type { Request, Response } from "express";

import { ListHostingPlansQueryDto, PanelLoginDto, ProvisionHostingDto } from "../dto";
import { CreateMailboxDto, UpdateMailboxDto, WebmailLoginDto } from "../dto/mailbox.dto";
import { HostingService } from "../service/hosting.service";
import { PanelSessionService } from "../service/panel-session.service";
import { PleskMailService } from "../service/plesk-mail.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import { getClientIp } from "@/utils/client-ip.util";

@Controller("hosting")
export class HostingController {
  constructor(
    private readonly hostingService: HostingService,
    private readonly panelSession: PanelSessionService,
    private readonly pleskMailService: PleskMailService,
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

  @Get(":id/mail")
  listMail(@Param("id") id: string, @User() user: AuthUser) {
    return this.pleskMailService.getMailSummary(id, user.id);
  }

  @Post(":id/mailboxes")
  createMailbox(@Param("id") id: string, @User() user: AuthUser, @Body() dto: CreateMailboxDto) {
    return this.pleskMailService.createMailbox(id, user.id, dto);
  }

  @Patch(":id/mailboxes/:name")
  updateMailbox(
    @Param("id") id: string,
    @Param("name") name: string,
    @User() user: AuthUser,
    @Body() dto: UpdateMailboxDto,
  ) {
    return this.pleskMailService.updateMailbox(id, user.id, name, dto);
  }

  @Delete(":id/mailboxes/:name")
  deleteMailbox(@Param("id") id: string, @Param("name") name: string, @User() user: AuthUser) {
    return this.pleskMailService.deleteMailbox(id, user.id, name);
  }

  @Post(":id/webmail-login")
  webmailLogin(
    @Param("id") id: string,
    @User() user: AuthUser,
    @Body() dto: WebmailLoginDto,
    @Req() req: Request,
  ) {
    const clientIp = dto.clientIp ?? getClientIp(req);
    return this.pleskMailService.createWebmailLoginUrl(id, user.id, clientIp);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.hostingService.getForUser(id, user.id);
  }
}
