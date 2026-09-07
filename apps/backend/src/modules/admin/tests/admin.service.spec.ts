import { Test, TestingModule } from "@nestjs/testing";

import { AdminRepository } from "../repository/admin.repository";
import { AdminPaymentsRepository } from "../service/admin-system.service";
import { AdminService } from "../service/admin.service";

import { AuthService } from "@/modules/auth/service/auth.service";
import { DomainBillingService } from "@/modules/domains/service/domain-billing.service";
import { HostingBillingService } from "@/modules/hosting/service/hosting-billing.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { LicensesService } from "@/modules/licenses/service/licenses.service";
import { PaymentsRepository } from "@/modules/payments/repository/payments.repository";
import { WhatsappApiService } from "@/modules/whatsapp/service/whatsapp-api.service";
import { CbarExchangeService } from "@/shared/pricing/cbar-exchange.service";

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: {} },
        { provide: AdminPaymentsRepository, useValue: { listPayments: jest.fn() } },
        { provide: OrderFulfillmentService, useValue: { fulfillOrder: jest.fn() } },
        { provide: LicensesService, useValue: {} },
        { provide: WhatsappApiService, useValue: {} },
        { provide: PaymentsRepository, useValue: { markInvoicePaidManually: jest.fn() } },
        { provide: AuthService, useValue: {} },
        { provide: HostingBillingService, useValue: { activateAfterRenewalPayment: jest.fn() } },
        { provide: DomainBillingService, useValue: { activateAfterRenewalPayment: jest.fn() } },
        { provide: CbarExchangeService, useValue: { getRates: jest.fn() } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
