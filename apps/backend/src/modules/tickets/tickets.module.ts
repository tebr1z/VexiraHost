import { Module } from "@nestjs/common";

import { StorageModule } from "@/shared/storage/storage.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

import { TicketsController } from "./controller/tickets.controller";
import { TicketsService } from "./service/tickets.service";
import { TicketsRepository } from "./repository/tickets.repository";
import { TicketEmailService } from "./service/ticket-email.service";

@Module({
  imports: [StorageModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository, TicketEmailService, SmtpMailService],
  exports: [TicketsService],
})
export class TicketsModule {}
