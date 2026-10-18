import { Module } from "@nestjs/common";

import { SystemHealthService } from "./service/system-health.service";
import { SystemReportEmailService } from "./service/system-report-email.service";
import { SystemReportJobService } from "./service/system-report-job.service";

import { DomainsModule } from "@/modules/domains/domains.module";
import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [WhatsappModule, DomainsModule],
  providers: [
    SystemHealthService,
    SystemReportEmailService,
    SystemReportJobService,
    SmtpMailService,
  ],
  exports: [SystemReportJobService, SystemHealthService],
})
export class MonitoringModule {}
