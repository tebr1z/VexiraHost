import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class ServerExpiryJobService {
  private readonly logger = new Logger(ServerExpiryJobService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.prisma.server.updateMany({
        where: {
          status: { in: ["RUNNING", "STOPPED"] },
          expiresAt: { lte: new Date() },
        },
        data: { status: "SUSPENDED" },
      });
      if (result.count > 0) {
        this.logger.log(`Suspended ${result.count} expired VPS/dedicated servers`);
      }
    } finally {
      this.running = false;
    }
  }
}
