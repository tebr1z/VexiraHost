import { Injectable } from '@nestjs/common';

import { NotificationsRepository } from '../repository/notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}
}
