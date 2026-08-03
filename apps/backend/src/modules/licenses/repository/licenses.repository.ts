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

  findProductBySlug(slug: string) {
    return this.prisma.product.findUnique({ where: { slug } });
  }

  findProductById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  updateProductLicenseKeys(productId: string, licenseKeys: string | null) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { licenseKeys },
    });
  }

  findUserFreeClaim(userId: string, productName: string) {
    return this.prisma.addonService.findFirst({
      where: {
        userId,
        type: "LICENSE",
        name: productName,
        status: { in: ["ACTIVE", "PROVISIONING"] },
      },
    });
  }

  findByOrderId(orderId: string) {
    return this.prisma.addonService.findMany({
      where: {
        metadata: {
          path: ["orderId"],
          equals: orderId,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  findByOrderItem(orderId: string, orderItemId?: string) {
    if (orderItemId) {
      return this.prisma.addonService.findFirst({
        where: {
          AND: [
            { metadata: { path: ["orderId"], equals: orderId } },
            { metadata: { path: ["orderItemId"], equals: orderItemId } },
          ],
        },
      });
    }
    return this.prisma.addonService.findFirst({
      where: {
        metadata: {
          path: ["orderId"],
          equals: orderId,
        },
      },
    });
  }
}
