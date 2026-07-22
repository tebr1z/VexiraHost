import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/database.module';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}
}
