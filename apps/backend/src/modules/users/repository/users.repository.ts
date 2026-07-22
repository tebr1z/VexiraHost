import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/database.module';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}
}
