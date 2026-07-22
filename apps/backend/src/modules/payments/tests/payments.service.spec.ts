import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "@/database/database.module";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { PaymentsService } from "../service/payments.service";
import { PaymentsRepository } from "../repository/payments.repository";
import { MockPaymentProvider } from "../providers/mock-payment.provider";
import { KapitalPaymentProvider } from "../providers/kapital-payment.provider";

describe("PaymentsService", () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: {} },
        { provide: MockPaymentProvider, useValue: {} },
        { provide: KapitalPaymentProvider, useValue: {} },
        { provide: OrderFulfillmentService, useValue: { fulfillOrder: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => ({ provider: "mock" }) } },
        { provide: PrismaService, useValue: { systemSetting: { findUnique: jest.fn().mockResolvedValue(null) } } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
