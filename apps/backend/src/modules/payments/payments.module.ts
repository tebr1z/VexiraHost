import { Module } from "@nestjs/common";

import { PaymentsController } from "./controller/payments.controller";
import { KapitalPaymentProvider } from "./providers/kapital-payment.provider";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { PaymentsRepository } from "./repository/payments.repository";
import { BalanceEmailService } from "./service/balance-email.service";
import { BalanceService } from "./service/balance.service";
import { KapitalConfigService } from "./service/kapital-config.service";
import { PaymentsService } from "./service/payments.service";

import { DomainsModule } from "@/modules/domains/domains.module";
import { HostingModule } from "@/modules/hosting/hosting.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import { PricingModule } from "@/shared/pricing/pricing.module";

@Module({
  imports: [HostingModule, DomainsModule, NotificationsModule, PricingModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    BalanceService,
    BalanceEmailService,
    PaymentsRepository,
    MockPaymentProvider,
    KapitalConfigService,
    KapitalPaymentProvider,
    SmtpMailService,
  ],
  exports: [PaymentsService, PaymentsRepository, KapitalConfigService, BalanceService],
})
export class PaymentsModule {}
