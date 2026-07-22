import { Injectable } from "@nestjs/common";
import type { AddonServiceType, Prisma, ServiceStatus } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class LicensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.addonService.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.addonService.findFirst({
      where: { id, userId },
    });
  }

  createAddon(data: {
    userId: string;
    type: AddonServiceType;
    name: string;
    identifier?: string;
    status: ServiceStatus;
    metadata?: Prisma.InputJsonValue;
    expiresAt?: Date | null;
    provisionedAt?: Date;
  }) {
    return this.prisma.addonService.create({ data });
  }

  updateAddon(
    id: string,
    data: {
      identifier?: string;
      status?: ServiceStatus;
      metadata?: Prisma.InputJsonValue;
      expiresAt?: Date | null;
      provisionedAt?: Date;
    },
  ) {
    return this.prisma.addonService.update({ where: { id }, data });
  }
}
