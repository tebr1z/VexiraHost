import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/database.module';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}
}
