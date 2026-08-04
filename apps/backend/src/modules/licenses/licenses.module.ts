import { Module } from "@nestjs/common";

import { LicensesController } from "./controller/licenses.controller";
import { MockAddonProvider } from "./providers/mock-addon.provider";
import { LicensesRepository } from "./repository/licenses.repository";
import { AddonEmailService } from "./service/addon-email.service";
import { AddonExpiryJobService } from "./service/addon-expiry-job.service";
import { LicensesService } from "./service/licenses.service";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  controllers: [LicensesController],
  providers: [
    LicensesService,
    LicensesRepository,
    MockAddonProvider,
    AddonEmailService,
    AddonExpiryJobService,
    SmtpMailService,
  ],
  exports: [LicensesService, AddonExpiryJobService],
})
export class LicensesModule {}
