import { Module } from "@nestjs/common";

import { AdminCampaignsController } from "./controller/admin-campaigns.controller";
import { MarketingController } from "./controller/marketing.controller";
import { MarketingRepository } from "./repository/marketing.repository";
import { CampaignEmailService } from "./service/campaign-email.service";
import { MarketingService } from "./service/marketing.service";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  controllers: [MarketingController, AdminCampaignsController],
  providers: [MarketingService, MarketingRepository, CampaignEmailService, SmtpMailService],
  exports: [MarketingService],
})
export class MarketingModule {}
