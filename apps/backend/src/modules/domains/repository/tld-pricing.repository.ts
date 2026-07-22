import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class TldPricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  listAll() {
    return this.prisma.tldPricing.findMany({ orderBy: [{ sortOrder: "asc" }, { tld: "asc" }] });
  }

  listActive() {
    return this.prisma.tldPricing.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { tld: "asc" }],
    });
  }

  findById(id: string) {
    return this.prisma.tldPricing.findUnique({ where: { id } });
  }

  findByTld(tld: string) {
    return this.prisma.tldPricing.findUnique({ where: { tld: tld.toLowerCase() } });
  }

  create(data: {
    tld: string;
    registerPrice: number;
    renewPrice: number;
    transferPrice: number;
    currency?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.tldPricing.create({
      data: {
        tld: data.tld.toLowerCase(),
        registerPrice: data.registerPrice,
        renewPrice: data.renewPrice,
        transferPrice: data.transferPrice,
        currency: data.currency ?? "USD",
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  update(
    id: string,
    data: Partial<{
      registerPrice: number;
      renewPrice: number;
      transferPrice: number;
      currency: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.prisma.tldPricing.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.tldPricing.delete({ where: { id } });
  }
}
