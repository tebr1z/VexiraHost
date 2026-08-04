import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class AddonExpiryJobService {
  private readonly logger = new Logger(AddonExpiryJobService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.prisma.addonService.updateMany({
        where: {
          status: "ACTIVE",
          expiresAt: { lte: new Date() },
        },
        data: { status: "EXPIRED" },
      });
      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} add-on services as expired`);
      }
    } finally {
      this.running = false;
    }
  }
}
