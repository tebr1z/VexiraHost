import { Module } from "@nestjs/common";

import { DomainsController } from "./controller/domains.controller";
import { CloudflareDnsProvider } from "./providers/cloudflare-dns.provider";
import { MockRegistrarProvider } from "./providers/mock-registrar.provider";
import { NameSiloRegistrarProvider } from "./providers/namesilo-registrar.provider";
import { PowerDnsProvider } from "./providers/powerdns.provider";
import { DomainsRepository } from "./repository/domains.repository";
import { TldPricingRepository } from "./repository/tld-pricing.repository";
import { AuthoritativeDnsService } from "./service/authoritative-dns.service";
import { DomainBillingService } from "./service/domain-billing.service";
import { DomainCheckoutService } from "./service/domain-checkout.service";
import { DomainEmailService } from "./service/domain-email.service";
import { DomainsService } from "./service/domains.service";
import { RegistrarService } from "./service/registrar.service";

import { AuthModule } from "@/modules/auth/auth.module";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Module({
  imports: [AuthModule],
  controllers: [DomainsController],
  providers: [
    DomainCheckoutService,
    DomainsService,
    DomainsRepository,
    TldPricingRepository,
    MockRegistrarProvider,
    NameSiloRegistrarProvider,
    RegistrarService,
    CloudflareDnsProvider,
    PowerDnsProvider,
    AuthoritativeDnsService,
    RegistrarService,
    DomainEmailService,
    DomainBillingService,
    SmtpMailService,
  ],
  exports: [
    DomainCheckoutService,
    DomainsService,
    DomainsRepository,
    TldPricingRepository,
    DomainBillingService,
    DomainEmailService,
    CloudflareDnsProvider,
    PowerDnsProvider,
    AuthoritativeDnsService,
  ],
})
export class DomainsModule {}
