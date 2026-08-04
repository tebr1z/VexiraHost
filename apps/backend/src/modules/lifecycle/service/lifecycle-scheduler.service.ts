import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Queue } from "bullmq";

import { LifecycleJob } from "../lifecycle-jobs.constants";

import { LifecycleWorkerService } from "./lifecycle-worker.service";

import { LIFECYCLE_QUEUE } from "@/queue/queue.module";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

@Injectable()
export class LifecycleSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LifecycleSchedulerService.name);
  private readonly fallbackTimers: NodeJS.Timeout[] = [];

  constructor(
    @Inject(LIFECYCLE_QUEUE) private readonly queue: Queue | null,
    private readonly worker: LifecycleWorkerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.queue) {
      this.logger.warn("Redis queue unavailable; lifecycle jobs use single-process timers.");
      this.scheduleFallback(LifecycleJob.INVOICE_REMINDER, FIFTEEN_MINUTES);
      this.scheduleFallback(LifecycleJob.HOSTING_EXPIRY, ONE_HOUR);
      this.scheduleFallback(LifecycleJob.DOMAIN_EXPIRY, ONE_HOUR);
      this.scheduleFallback(LifecycleJob.ADDON_EXPIRY, ONE_HOUR);
      this.scheduleFallback(LifecycleJob.SERVER_EXPIRY, ONE_HOUR);
      return;
    }

    const options = {
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    };
    await Promise.all([
      this.queue.upsertJobScheduler(
        LifecycleJob.INVOICE_REMINDER,
        { every: FIFTEEN_MINUTES },
        { name: LifecycleJob.INVOICE_REMINDER, data: {}, opts: options },
      ),
      this.queue.upsertJobScheduler(
        LifecycleJob.HOSTING_EXPIRY,
        { every: ONE_HOUR },
        { name: LifecycleJob.HOSTING_EXPIRY, data: {}, opts: options },
      ),
      this.queue.upsertJobScheduler(
        LifecycleJob.DOMAIN_EXPIRY,
        { every: ONE_HOUR },
        { name: LifecycleJob.DOMAIN_EXPIRY, data: {}, opts: options },
      ),
      this.queue.upsertJobScheduler(
        LifecycleJob.ADDON_EXPIRY,
        { every: ONE_HOUR },
        { name: LifecycleJob.ADDON_EXPIRY, data: {}, opts: options },
      ),
      this.queue.upsertJobScheduler(
        LifecycleJob.SERVER_EXPIRY,
        { every: ONE_HOUR },
        { name: LifecycleJob.SERVER_EXPIRY, data: {}, opts: options },
      ),
    ]);
    this.logger.log("Global lifecycle job schedulers registered in BullMQ");
  }

  onModuleDestroy(): void {
    this.fallbackTimers.forEach(clearInterval);
  }

  private scheduleFallback(name: string, interval: number): void {
    setTimeout(() => void this.runFallback(name), 15_000);
    this.fallbackTimers.push(setInterval(() => void this.runFallback(name), interval));
  }

  private async runFallback(name: string): Promise<void> {
    try {
      await this.worker.process(name);
    } catch (error) {
      this.logger.warn(
        `Local lifecycle job ${name} deferred: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
