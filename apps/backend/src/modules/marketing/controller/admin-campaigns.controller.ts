import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@vexira/types";

import { CreateCampaignDto, SetMarketingOptInDto, UpdateCampaignDto } from "../dto/campaign.dto";
import { MarketingService } from "../service/marketing.service";

import { Roles } from "@/decorators/auth.decorators";
import { RolesGuard } from "@/guards/roles.guard";

@Controller("admin/campaigns")
@UseGuards(RolesGuard)
export class AdminCampaignsController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list() {
    return this.marketingService.listCampaigns();
  }

  @Get("subscribers")
  @Roles(UserRole.ADMIN)
  listSubscribers(
    @Query("filter") filter?: "subscribed" | "unsubscribed" | "all",
    @Query("q") q?: string,
  ) {
    const allowed = filter === "subscribed" || filter === "unsubscribed" || filter === "all";
    return this.marketingService.listSubscribers(allowed ? filter : "all", q);
  }

  @Patch("subscribers/:userId")
  @Roles(UserRole.ADMIN)
  setSubscriberOptIn(@Param("userId") userId: string, @Body() dto: SetMarketingOptInDto) {
    return this.marketingService.setSubscriberOptIn(userId, dto.marketingOptIn);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCampaignDto) {
    return this.marketingService.createCampaign(dto);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  get(@Param("id") id: string) {
    return this.marketingService.getCampaign(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.marketingService.updateCampaign(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string) {
    return this.marketingService.deleteCampaign(id);
  }

  @Post(":id/send")
  @Roles(UserRole.ADMIN)
  send(@Param("id") id: string) {
    return this.marketingService.sendCampaign(id);
  }
}
