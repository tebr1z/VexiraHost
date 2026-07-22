import { Test, TestingModule } from '@nestjs/testing';

import { BillingService } from '../service/billing.service';
import { BillingRepository } from '../repository/billing.repository';

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: BillingRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
