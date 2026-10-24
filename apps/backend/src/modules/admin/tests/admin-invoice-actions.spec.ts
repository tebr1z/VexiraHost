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

describe("admin invoice settlement", () => {
  const invoice = {
    id: "invoice",
    userId: "customer",
    orderId: "order",
    status: "OPEN",
    total: 10,
    currency: "AZN",
    order: { status: "PENDING" },
  };
  const repository = { findInvoiceById: jest.fn() };
  const payments = { markInvoicePaidManually: jest.fn() };
  const hosting = { activateAfterRenewalPayment: jest.fn() };
  const domains = { activateAfterRenewalPayment: jest.fn() };
  const fulfillment = { fulfillOrder: jest.fn() };
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.findInvoiceById.mockResolvedValue(invoice);
    payments.markInvoicePaidManually.mockReset();
    payments.markInvoicePaidManually.mockResolvedValue({ alreadyPaid: false });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: repository },
        { provide: AdminPaymentsRepository, useValue: { listPayments: jest.fn() } },
        { provide: OrderFulfillmentService, useValue: fulfillment },
        { provide: LicensesService, useValue: {} },
        { provide: WhatsappApiService, useValue: {} },
        { provide: PaymentsRepository, useValue: payments },
        { provide: AuthService, useValue: {} },
        { provide: HostingBillingService, useValue: hosting },
        { provide: DomainBillingService, useValue: domains },
        { provide: CbarExchangeService, useValue: { getRates: jest.fn() } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("starts service activation only once if another admin already settled the invoice", async () => {
    payments.markInvoicePaidManually
      .mockResolvedValueOnce({ alreadyPaid: false })
      .mockResolvedValueOnce({ alreadyPaid: true });
    await service.markInvoicePaid("invoice");
    await service.markInvoicePaid("invoice");
    expect(hosting.activateAfterRenewalPayment).toHaveBeenCalledTimes(1);
    expect(domains.activateAfterRenewalPayment).toHaveBeenCalledTimes(1);
    expect(fulfillment.fulfillOrder).toHaveBeenCalledTimes(1);
  });
  it("does not activate anything when settlement is blocked by a pending bank payment", async () => {
    payments.markInvoicePaidManually.mockRejectedValue(new Error("INVOICE_PENDING_PAYMENT"));
    await expect(service.markInvoicePaid("invoice")).rejects.toThrow("INVOICE_PENDING_PAYMENT");
    expect(hosting.activateAfterRenewalPayment).not.toHaveBeenCalled();
    expect(fulfillment.fulfillOrder).not.toHaveBeenCalled();
  });
  it("rejects void invoices before recording money or activating services", async () => {
    repository.findInvoiceById.mockResolvedValue({ ...invoice, status: "VOID" });
    await expect(service.markInvoicePaid("invoice")).rejects.toThrow("INVOICE_NOT_PAYABLE");
    expect(payments.markInvoicePaidManually).not.toHaveBeenCalled();
    expect(fulfillment.fulfillOrder).not.toHaveBeenCalled();
  });
  it("does not repeat settlement of already paid invoices", async () => {
    repository.findInvoiceById.mockResolvedValue({ ...invoice, status: "PAID" });
    expect(await service.markInvoicePaid("invoice")).toMatchObject({ status: "PAID" });
    expect(payments.markInvoicePaidManually).not.toHaveBeenCalled();
    expect(hosting.activateAfterRenewalPayment).not.toHaveBeenCalled();
  });
  it("returns not found before changing any payment for a missing invoice", async () => {
    repository.findInvoiceById.mockResolvedValue(null);
    await expect(service.markInvoicePaid("invoice")).rejects.toThrow("Invoice not found");
    expect(payments.markInvoicePaidManually).not.toHaveBeenCalled();
  });
});
