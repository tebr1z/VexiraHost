import { Module } from "@nestjs/common";

import { HostingController } from "./controller/hosting.controller";
import { MockControlPanelProvider } from "./providers/mock-control-panel.provider";
import { HostingServersRepository } from "./repository/hosting-servers.repository";
import { HostingRepository } from "./repository/hosting.repository";
import { HostingBillingService } from "./service/hosting-billing.service";
import { HostingEmailService } from "./service/hosting-email.service";
import { HostingExpiryJobService } from "./service/hosting-expiry-job.service";
import { HostingProvisionRunner } from "./service/hosting-provision.runner";
import { HostingServersService } from "./service/hosting-servers.service";
import { HostingService } from "./service/hosting.service";
import { OrderFulfillmentService } from "./service/order-fulfillment.service";
import { PanelSessionService } from "./service/panel-session.service";
import { PleskPanelService } from "./service/plesk-panel.service";

import { LicensesModule } from "@/modules/licenses/licenses.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [LicensesModule],
  controllers: [HostingController],

  providers: [
    HostingService,

    HostingServersService,

    OrderFulfillmentService,

    HostingRepository,

    HostingServersRepository,

    MockControlPanelProvider,

    PanelSessionService,

    PleskPanelService,

    HostingProvisionRunner,

    HostingEmailService,

    HostingBillingService,

    HostingExpiryJobService,

    SmtpMailService,
  ],

  exports: [
    HostingService,
    HostingServersService,
    OrderFulfillmentService,
    HostingRepository,
    HostingBillingService,
    HostingEmailService,
  ],
})
export class HostingModule {}
