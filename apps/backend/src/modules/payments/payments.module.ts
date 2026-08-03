import { Module } from "@nestjs/common";

import { PaymentsController } from "./controller/payments.controller";
import { KapitalPaymentProvider } from "./providers/kapital-payment.provider";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { PaymentsRepository } from "./repository/payments.repository";
import { BalanceService } from "./service/balance.service";
import { KapitalConfigService } from "./service/kapital-config.service";
import { PaymentsService } from "./service/payments.service";

import { DomainsModule } from "@/modules/domains/domains.module";
import { HostingModule } from "@/modules/hosting/hosting.module";

@Module({
  imports: [HostingModule, DomainsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    BalanceService,
    PaymentsRepository,
    MockPaymentProvider,
    KapitalConfigService,
    KapitalPaymentProvider,
  ],
  exports: [PaymentsService, PaymentsRepository, KapitalConfigService, BalanceService],
})
export class PaymentsModule {}
