import { Module } from "@nestjs/common";

import { AdminWhatsappController } from "./controller/admin-whatsapp.controller";
import { PublicWhatsappApiController } from "./controller/public-whatsapp-api.controller";
import { WhatsappApiController } from "./controller/whatsapp-api.controller";
import { WhatsappApiKeyGuard } from "./guards/whatsapp-api-key.guard";
import { WhatsappApiRepository } from "./repository/whatsapp-api.repository";
import { WhatsappRepository } from "./repository/whatsapp.repository";
import { WhatsappApiService } from "./service/whatsapp-api.service";
import { WhatsappSessionService } from "./service/whatsapp-session.service";
import { WhatsappService } from "./service/whatsapp.service";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  controllers: [AdminWhatsappController, WhatsappApiController, PublicWhatsappApiController],
  providers: [
    WhatsappRepository,
    WhatsappApiRepository,
    WhatsappSessionService,
    WhatsappService,
    WhatsappApiService,
    WhatsappApiKeyGuard,
    SmtpMailService,
  ],
  exports: [WhatsappRepository, WhatsappService, WhatsappSessionService, WhatsappApiService],
})
export class WhatsappModule {}
