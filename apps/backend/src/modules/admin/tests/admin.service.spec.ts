import { Test, TestingModule } from "@nestjs/testing";

import { AuthService } from "@/modules/auth/service/auth.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { PaymentsRepository } from "@/modules/payments/repository/payments.repository";

import { AdminPaymentsRepository } from "../service/admin-system.service";
import { AdminRepository } from "../repository/admin.repository";
import { AdminService } from "../service/admin.service";

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: {} },
        { provide: AdminPaymentsRepository, useValue: { listPayments: jest.fn() } },
        { provide: OrderFulfillmentService, useValue: { fulfillOrder: jest.fn() } },
        { provide: PaymentsRepository, useValue: { markInvoicePaidManually: jest.fn() } },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
