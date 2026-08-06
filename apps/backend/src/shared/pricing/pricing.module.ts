import { Global, Module } from "@nestjs/common";

import { CbarExchangeService } from "./cbar-exchange.service";

@Global()
@Module({
  providers: [CbarExchangeService],
  exports: [CbarExchangeService],
})
export class PricingModule {}
