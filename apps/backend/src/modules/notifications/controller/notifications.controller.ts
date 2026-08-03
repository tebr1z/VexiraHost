import { Controller, Get, Param, Patch } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import { NotificationsService } from "../service/notifications.service";

import { User } from "@/decorators/user.decorator";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@User() user: AuthUser) {
    return this.notificationsService.listForUser(user.id);
  }

  @Get("unread-count")
  unreadCount(@User() user: AuthUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Patch("read-all")
  markAllRead(@User() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(":id/read")
  markRead(@User() user: AuthUser, @Param("id") id: string) {
    return this.notificationsService.markRead(user.id, id);
  }
}
