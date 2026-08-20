import { Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { SubmitInquiryDto } from "../dto/submit-inquiry.dto";
import { ContactService } from "../service/contact.service";

import { Public } from "@/decorators/auth.decorators";
import { SiteAccessService } from "@/modules/auth/service/site-access.service";
import { TurnstileService } from "@/modules/auth/service/turnstile.service";
import { getClientIp } from "@/utils/client-ip.util";

@Controller()
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly turnstileService: TurnstileService,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  @Public()
  @Post("contact")
  async contact(@Body() dto: SubmitInquiryDto, @Req() req: Request) {
    const ip = getClientIp(req);
    const action = dto.kind === "support" ? "support" : "contact";
    await this.siteAccessService.assertSectionOpen(action);
    await this.turnstileService.assertValid(dto.turnstileToken, action, ip);
    return this.contactService.submit({ ...dto, kind: dto.kind ?? "contact" }, ip);
  }
}
