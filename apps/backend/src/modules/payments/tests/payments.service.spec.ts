import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

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

describe("PaymentsService Epoint callback verification", () => {
  function fixture(options?: { verifiedAmount?: string; statusError?: boolean }) {
    const pending = {
      id: "payment-1",
      invoiceId: "invoice-1",
      amount: new Prisma.Decimal("19.90"),
      invoice: { orderId: null, order: null },
    };
    const repository = {
      findPendingByGatewayRef: jest.fn().mockResolvedValue(pending),
      completePendingPayment: jest.fn().mockResolvedValue({ id: pending.id }),
      failPendingPayment: jest.fn(),
    };
    const epoint = {
      decodeAndVerifyCallback: jest.fn().mockReturnValue({
        status: "success",
        code: "000",
        transaction: "te-1",
        amount: "19.90",
        operation_code: "100",
      }),
      getPaymentStatus: options?.statusError
        ? jest.fn().mockRejectedValue(new Error("gateway timeout"))
        : jest.fn().mockResolvedValue({
            status: "success",
            code: "000",
            transaction: "te-1",
            amount: options?.verifiedAmount ?? "19.90",
          }),
    };
    const hostingBilling = { activateAfterRenewalPayment: jest.fn() };
    const domainBilling = { activateAfterRenewalPayment: jest.fn() };
    const service = new PaymentsService(
      repository as never,
      {} as never,
      {} as never,
      epoint as never,
      { fulfillOrder: jest.fn() } as never,
      hostingBilling as never,
      domainBilling as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, repository, epoint, hostingBilling, domainBilling };
  }

  it("completes only after Epoint independently confirms transaction and amount", async () => {
    const value = fixture();
    await expect(value.service.handleEpointCallback("signed-data", "signature")).resolves.toEqual({
      ok: true,
      type: "payment",
    });
    expect(value.epoint.getPaymentStatus).toHaveBeenCalledWith("te-1");
    expect(value.repository.completePendingPayment).toHaveBeenCalledWith({
      paymentId: "payment-1",
      invoiceId: "invoice-1",
      orderId: null,
    });
    expect(value.hostingBilling.activateAfterRenewalPayment).toHaveBeenCalledWith("invoice-1");
  });

  it("does not complete when Epoint reports a different amount", async () => {
    const value = fixture({ verifiedAmount: "1.00" });
    await expect(value.service.handleEpointCallback("signed-data", "signature")).resolves.toEqual({
      ok: false,
      reason: "amount_mismatch",
    });
    expect(value.repository.completePendingPayment).not.toHaveBeenCalled();
  });

  it("keeps the payment pending when remote status verification is unavailable", async () => {
    const value = fixture({ statusError: true });
    await expect(value.service.handleEpointCallback("signed-data", "signature")).resolves.toEqual({
      ok: false,
      reason: "status_check_failed",
    });
    expect(value.repository.completePendingPayment).not.toHaveBeenCalled();
  });
});
