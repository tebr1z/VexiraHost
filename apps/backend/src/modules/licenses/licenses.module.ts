import { Module } from "@nestjs/common";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

import { LicensesController } from "./controller/licenses.controller";
import { MockAddonProvider } from "./providers/mock-addon.provider";
import { LicensesRepository } from "./repository/licenses.repository";
import { AddonEmailService } from "./service/addon-email.service";
import { LicensesService } from "./service/licenses.service";

@Module({
  controllers: [LicensesController],
  providers: [
    LicensesService,
    LicensesRepository,
    MockAddonProvider,
    AddonEmailService,
    SmtpMailService,
  ],
  exports: [LicensesService],
})
export class LicensesModule {}
