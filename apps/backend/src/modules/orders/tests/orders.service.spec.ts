import { Test, TestingModule } from "@nestjs/testing";

import { OrdersRepository } from "../repository/orders.repository";
import { OrderEmailService } from "../service/order-email.service";
import { OrdersService } from "../service/orders.service";

import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { SiteAccessService } from "@/modules/auth/service/site-access.service";
import { StaffAlertService } from "@/shared/staff-alerts/staff-alert.service";

describe("OrdersService", () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: {} },
        { provide: AuthRepository, useValue: {} },
        { provide: OrderEmailService, useValue: {} },
        { provide: StaffAlertService, useValue: { notify: jest.fn() } },
        { provide: SiteAccessService, useValue: { assertCheckoutOpen: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
