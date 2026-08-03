import { Module } from "@nestjs/common";

import { NotificationsController } from "./controller/notifications.controller";
import { NotificationsRepository } from "./repository/notifications.repository";
import { NotificationsService } from "./service/notifications.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
