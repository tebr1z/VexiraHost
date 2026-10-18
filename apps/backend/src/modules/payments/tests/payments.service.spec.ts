import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { EpointPaymentProvider } from "../providers/epoint-payment.provider";
import { KapitalPaymentProvider } from "../providers/kapital-payment.provider";
import { MockPaymentProvider } from "../providers/mock-payment.provider";
import { PaymentsRepository } from "../repository/payments.repository";
import { BalanceService } from "../service/balance.service";
import { PaymentsService } from "../service/payments.service";

import { PrismaService } from "@/database/database.module";
import { DomainBillingService } from "@/modules/domains/service/domain-billing.service";
import { HostingBillingService } from "@/modules/hosting/service/hosting-billing.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";

describe("PaymentsService", () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: {} },
        { provide: MockPaymentProvider, useValue: {} },
        { provide: KapitalPaymentProvider, useValue: {} },
        { provide: EpointPaymentProvider, useValue: {} },
        { provide: OrderFulfillmentService, useValue: { fulfillOrder: jest.fn() } },
        { provide: HostingBillingService, useValue: { activateAfterRenewalPayment: jest.fn() } },
        { provide: DomainBillingService, useValue: { activateAfterRenewalPayment: jest.fn() } },
        { provide: BalanceService, useValue: { getBalance: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => ({ provider: "mock" }) } },
        {
          provide: PrismaService,
          useValue: { systemSetting: { findUnique: jest.fn().mockResolvedValue(null) } },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
