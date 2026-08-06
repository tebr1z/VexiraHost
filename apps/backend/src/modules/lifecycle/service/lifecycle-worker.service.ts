import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { ConnectionOptions, Job, Queue, Worker } from "bullmq";

import { LIFECYCLE_QUEUE_NAME, LifecycleJob } from "../lifecycle-jobs.constants";

import { InvoiceReminderJobService } from "./invoice-reminder-job.service";

import { DomainExpiryJobService } from "@/modules/domains/service/domain-expiry-job.service";
import { HostingExpiryJobService } from "@/modules/hosting/service/hosting-expiry-job.service";
import { AddonExpiryJobService } from "@/modules/licenses/service/addon-expiry-job.service";
import { SystemReportJobService } from "@/modules/monitoring/service/system-report-job.service";
import { ServerExpiryJobService } from "@/modules/servers/service/server-expiry-job.service";
import { TicketAutoCloseJobService } from "@/modules/tickets/service/ticket-auto-close-job.service";
import { LIFECYCLE_QUEUE, QUEUE_CONNECTION, createWorker } from "@/queue/queue.module";

@Injectable()
export class LifecycleWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LifecycleWorkerService.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(QUEUE_CONNECTION) private readonly connection: ConnectionOptions,
    @Inject(LIFECYCLE_QUEUE) private readonly queue: Queue | null,
    private readonly invoiceReminder: InvoiceReminderJobService,
    private readonly hostingExpiry: HostingExpiryJobService,
    private readonly domainExpiry: DomainExpiryJobService,
    private readonly addonExpiry: AddonExpiryJobService,
    private readonly serverExpiry: ServerExpiryJobService,
    private readonly systemReport: SystemReportJobService,
    private readonly ticketAutoClose: TicketAutoCloseJobService,
  ) {}

  onModuleInit(): void {
    if (!this.queue) return;
    this.worker = createWorker(
      LIFECYCLE_QUEUE_NAME,
      async (job: Job) => this.process(job.name),
      this.connection,
    );
    this.worker.on("failed", (job, error) => {
      this.logger.error(`Lifecycle job ${job?.name ?? "unknown"} failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  async process(name: string): Promise<void> {
    switch (name) {
      case LifecycleJob.INVOICE_REMINDER:
        await this.invoiceReminder.tick();
        return;
      case LifecycleJob.HOSTING_EXPIRY:
        await this.hostingExpiry.tick();
        return;
      case LifecycleJob.DOMAIN_EXPIRY:
        await this.domainExpiry.tick();
        return;
      case LifecycleJob.ADDON_EXPIRY:
        await this.addonExpiry.tick();
        return;
      case LifecycleJob.SERVER_EXPIRY:
        await this.serverExpiry.tick();
        return;
      case LifecycleJob.SYSTEM_HOURLY_REPORT:
        await this.systemReport.tick();
        return;
      case LifecycleJob.TICKET_AUTO_CLOSE:
        await this.ticketAutoClose.tick();
        return;
      default:
        this.logger.warn(`Ignoring unknown lifecycle job: ${name}`);
    }
  }
}
