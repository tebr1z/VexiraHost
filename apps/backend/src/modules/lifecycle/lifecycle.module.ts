import { Module } from "@nestjs/common";

import { InvoiceReminderJobService } from "./service/invoice-reminder-job.service";
import { LifecycleSchedulerService } from "./service/lifecycle-scheduler.service";
import { LifecycleWorkerService } from "./service/lifecycle-worker.service";
import { RenewalPaymentService } from "./service/renewal-payment.service";

import { DomainsModule } from "@/modules/domains/domains.module";
import { DomainExpiryJobService } from "@/modules/domains/service/domain-expiry-job.service";
import { HostingModule } from "@/modules/hosting/hosting.module";
import { HostingExpiryJobService } from "@/modules/hosting/service/hosting-expiry-job.service";
import { LicensesModule } from "@/modules/licenses/licenses.module";
import { MonitoringModule } from "@/modules/monitoring/monitoring.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { PaymentsModule } from "@/modules/payments/payments.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { TicketsModule } from "@/modules/tickets/tickets.module";
import { WhatsappModule } from "@/modules/whatsapp/whatsapp.module";

@Module({
  imports: [
    DomainsModule,
    HostingModule,
    LicensesModule,
    MonitoringModule,
    NotificationsModule,
    PaymentsModule,
    ServersModule,
    TicketsModule,
    WhatsappModule,
  ],
  providers: [
    InvoiceReminderJobService,
    RenewalPaymentService,
    HostingExpiryJobService,
    DomainExpiryJobService,
    LifecycleWorkerService,
    LifecycleSchedulerService,
  ],
})
export class LifecycleModule {}
