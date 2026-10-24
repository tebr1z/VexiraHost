import { Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { SubmitInquiryDto } from "../dto/submit-inquiry.dto";
import { ContactService } from "../service/contact.service";

import { Public } from "@/decorators/auth.decorators";
import { SiteAccessService } from "@/modules/auth/service/site-access.service";
import { TurnstileService } from "@/modules/auth/service/turnstile.service";
import { ProjectPricingService } from "@/modules/project-pricing/project-pricing.service";
import { getClientIp } from "@/utils/client-ip.util";

@Controller()
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly projectPricing: ProjectPricingService,
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
    if (dto.projectQuote) {
      const summary = await this.projectPricing.proposalSummary({
        ...dto.projectQuote,
        pricingUpdatedAt: dto.projectQuote.pricingUpdatedAt ?? null,
      });
      dto.message = `${summary}\n\nCustomer brief:\n${dto.message}`;
    }
    return this.contactService.submit({ ...dto, kind: dto.kind ?? "contact" }, ip);
  }
}
