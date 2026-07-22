import { Module } from "@nestjs/common";



import { DomainsController } from "./controller/domains.controller";

import { MockRegistrarProvider } from "./providers/mock-registrar.provider";

import { DomainsRepository } from "./repository/domains.repository";

import { TldPricingRepository } from "./repository/tld-pricing.repository";

import { DomainsService } from "./service/domains.service";



@Module({

  controllers: [DomainsController],

  providers: [DomainsService, DomainsRepository, TldPricingRepository, MockRegistrarProvider],

  exports: [DomainsService, TldPricingRepository],

})

export class DomainsModule {}


