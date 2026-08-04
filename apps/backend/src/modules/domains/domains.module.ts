import { Module } from "@nestjs/common";

import { DomainsController } from "./controller/domains.controller";
import { MockRegistrarProvider } from "./providers/mock-registrar.provider";
import { DomainsRepository } from "./repository/domains.repository";
import { TldPricingRepository } from "./repository/tld-pricing.repository";
import { DomainBillingService } from "./service/domain-billing.service";
import { DomainEmailService } from "./service/domain-email.service";
import { DomainExpiryJobService } from "./service/domain-expiry-job.service";
import { DomainsService } from "./service/domains.service";

import { HostingModule } from "@/modules/hosting/hosting.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [HostingModule],
  controllers: [DomainsController],
  providers: [
    DomainsService,
    DomainsRepository,
    TldPricingRepository,
    MockRegistrarProvider,
    DomainEmailService,
    DomainBillingService,
    DomainExpiryJobService,
    SmtpMailService,
  ],
  exports: [
    DomainsService,
    DomainsRepository,
    TldPricingRepository,
    DomainBillingService,
    DomainExpiryJobService,
  ],
})
export class DomainsModule {}
