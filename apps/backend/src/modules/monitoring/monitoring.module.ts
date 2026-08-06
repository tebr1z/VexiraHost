import { Module } from "@nestjs/common";

import { SystemHealthService } from "./service/system-health.service";
import { SystemReportEmailService } from "./service/system-report-email.service";
import { SystemReportJobService } from "./service/system-report-job.service";

import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [WhatsappModule],
  providers: [
    SystemHealthService,
    SystemReportEmailService,
    SystemReportJobService,
    SmtpMailService,
  ],
  exports: [SystemReportJobService, SystemHealthService],
})
export class MonitoringModule {}
