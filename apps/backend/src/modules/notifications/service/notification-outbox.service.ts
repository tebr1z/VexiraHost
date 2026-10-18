import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotificationOutboxChannel, NotificationOutboxStatus, type Prisma } from "@prisma/client";
import type { Queue } from "bullmq";

import type { NotificationTemplateName } from "../notification-outbox.constants";

import { NotificationOutboxProcessorService } from "./notification-outbox-processor.service";

import { PrismaService } from "@/database/database.module";
import { NOTIFICATION_QUEUE } from "@/queue/queue.module";

@Injectable()
export class NotificationOutboxService {
  private readonly logger = new Logger(NotificationOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: NotificationOutboxProcessorService,
    @Inject(NOTIFICATION_QUEUE) private readonly queue: Queue | null,
  ) {}

  async enqueue(input: {
    userId?: string;
    channel: NotificationOutboxChannel;
    recipient: string;
    template: NotificationTemplateName;
    payload: Prisma.InputJsonValue;
    dedupeKey: string;
  }) {
    const item = await this.prisma.notificationOutbox.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: {
        userId: input.userId,
        channel: input.channel,
        recipient: input.recipient,
        template: input.template,
        payload: input.payload,
        dedupeKey: input.dedupeKey,
      },
      update: {},
    });
    if (item.status === NotificationOutboxStatus.SENT) return item;

    if (this.queue) {
      await this.queue.add(
        "deliver",
        { outboxId: item.id },
        {
          jobId: item.id,
          attempts: 6,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: 250,
        },
      );
    } else {
      try {
        await this.processor.deliver(item.id);
      } catch (error) {
        this.logger.warn(
          `Synchronous outbox fallback failed; item remains retryable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return item;
  }

  async dispatchPending(limit = 200): Promise<void> {
    if (!this.queue) return;
    const items = await this.prisma.notificationOutbox.findMany({
      where: {
        status: { in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.FAILED] },
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });
    await Promise.all(
      items.map(({ id }) =>
        this.queue!.add("deliver", { outboxId: id }, { jobId: id, attempts: 6 }),
      ),
    );
  }
}
