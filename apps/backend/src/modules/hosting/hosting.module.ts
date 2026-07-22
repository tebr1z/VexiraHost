import { Module } from "@nestjs/common";

import { LicensesModule } from "@/modules/licenses/licenses.module";

import { HostingController } from "./controller/hosting.controller";

import { MockControlPanelProvider } from "./providers/mock-control-panel.provider";

import { HostingRepository } from "./repository/hosting.repository";

import { HostingServersRepository } from "./repository/hosting-servers.repository";

import { HostingServersService } from "./service/hosting-servers.service";

import { HostingService } from "./service/hosting.service";

import { HostingProvisionRunner } from "./service/hosting-provision.runner";
import { PanelSessionService } from "./service/panel-session.service";
import { PleskPanelService } from "./service/plesk-panel.service";

import { OrderFulfillmentService } from "./service/order-fulfillment.service";
import { HostingEmailService } from "./service/hosting-email.service";
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

    SmtpMailService,

  ],

  exports: [HostingService, HostingServersService, OrderFulfillmentService],

})

export class HostingModule {}


