import { Module } from "@nestjs/common";

import { InvoiceReminderJobService } from "./service/invoice-reminder-job.service";
import { LifecycleSchedulerService } from "./service/lifecycle-scheduler.service";
import { LifecycleWorkerService } from "./service/lifecycle-worker.service";

import { DomainsModule } from "@/modules/domains/domains.module";
import { HostingModule } from "@/modules/hosting/hosting.module";
import { LicensesModule } from "@/modules/licenses/licenses.module";
import { MonitoringModule } from "@/modules/monitoring/monitoring.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { TicketsModule } from "@/modules/tickets/tickets.module";
import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";

@Module({
  imports: [
    DomainsModule,
    HostingModule,
    LicensesModule,
    MonitoringModule,
    ServersModule,
    TicketsModule,
    WhatsappModule,
  ],
  providers: [InvoiceReminderJobService, LifecycleWorkerService, LifecycleSchedulerService],
})
export class LifecycleModule {}
