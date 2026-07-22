import { Module } from '@nestjs/common';

import { BillingController } from './controller/billing.controller';
import { BillingService } from './service/billing.service';
import { BillingRepository } from './repository/billing.repository';

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService],
})
export class BillingModule {}
