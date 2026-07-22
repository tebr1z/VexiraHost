import { Module } from "@nestjs/common";

import { HostingModule } from "@/modules/hosting/hosting.module";

import { PaymentsController } from "./controller/payments.controller";
import { KapitalConfigService } from "./service/kapital-config.service";
import { KapitalPaymentProvider } from "./providers/kapital-payment.provider";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { PaymentsRepository } from "./repository/payments.repository";
import { PaymentsService } from "./service/payments.service";

@Module({
  imports: [HostingModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    MockPaymentProvider,
    KapitalConfigService,
    KapitalPaymentProvider,
  ],
  exports: [PaymentsService, PaymentsRepository, KapitalConfigService],
})
export class PaymentsModule {}
