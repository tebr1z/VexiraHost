import { Module } from "@nestjs/common";

import { NotificationsController } from "./controller/notifications.controller";
import { NotificationsRepository } from "./repository/notifications.repository";
import { NotificationOutboxProcessorService } from "./service/notification-outbox-processor.service";
import { NotificationOutboxWorkerService } from "./service/notification-outbox-worker.service";
import { NotificationOutboxService } from "./service/notification-outbox.service";
import { NotificationsService } from "./service/notifications.service";

import { HostingModule } from "@/modules/hosting/hosting.module";
import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [HostingModule, WhatsappModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationOutboxProcessorService,
    NotificationOutboxService,
    NotificationOutboxWorkerService,
    SmtpMailService,
  ],
  exports: [NotificationsService, NotificationOutboxService],
})
export class NotificationsModule {}
