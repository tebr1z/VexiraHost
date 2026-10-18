import { Test, TestingModule } from "@nestjs/testing";

import { BillingRepository } from "../repository/billing.repository";
import { BillingService } from "../service/billing.service";

describe("BillingService", () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BillingService, { provide: BillingRepository, useValue: {} }],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
