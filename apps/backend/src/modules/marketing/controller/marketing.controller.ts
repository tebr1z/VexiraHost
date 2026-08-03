import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { UnsubscribeDto } from "../dto/campaign.dto";
import { MarketingService } from "../service/marketing.service";

import { Public } from "@/decorators/auth.decorators";

@Controller("marketing")
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Public()
  @Post("unsubscribe")
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.marketingService.unsubscribe(dto.token);
  }

  /** Gmail / RFC 8058 one-click unsubscribe */
  @Public()
  @Post("unsubscribe/:token")
  unsubscribeOneClick(@Param("token") token: string) {
    return this.marketingService.unsubscribe(token);
  }

  @Public()
  @Get("unsubscribe/:token")
  unsubscribeGet(@Param("token") token: string) {
    return this.marketingService.unsubscribe(token);
  }
}
