import { Module } from "@nestjs/common";

import { TicketsController } from "./controller/tickets.controller";
import { TicketsRepository } from "./repository/tickets.repository";
import { TicketAutoCloseJobService } from "./service/ticket-auto-close-job.service";
import { TicketEmailService } from "./service/ticket-email.service";
import { TicketsService } from "./service/tickets.service";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import { StorageModule } from "@/shared/storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsRepository,
    TicketEmailService,
    TicketAutoCloseJobService,
    SmtpMailService,
  ],
  exports: [TicketsService, TicketAutoCloseJobService],
})
export class TicketsModule {}
