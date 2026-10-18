import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Queue, Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";

import { NOTIFICATION_QUEUE_NAME } from "../notification-outbox.constants";

import { NotificationOutboxProcessorService } from "./notification-outbox-processor.service";
import { NotificationOutboxService } from "./notification-outbox.service";

import { createWorker, NOTIFICATION_QUEUE, QUEUE_CONNECTION } from "@/queue/queue.module";

@Injectable()
export class NotificationOutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationOutboxWorkerService.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(QUEUE_CONNECTION) private readonly connection: ConnectionOptions,
    @Inject(NOTIFICATION_QUEUE) private readonly queue: Queue | null,
    private readonly processor: NotificationOutboxProcessorService,
    private readonly outbox: NotificationOutboxService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.queue) return;
    this.worker = createWorker(
      NOTIFICATION_QUEUE_NAME,
      async (job) => this.processor.deliver(String(job.data.outboxId)),
      this.connection,
    );
    this.worker.on("error", (error) => this.logger.error(`Worker error: ${error.message}`));
    await this.outbox.dispatchPending();
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
