import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvoiceStatus, PaymentMethodStatus, PaymentStatus, Prisma } from "@prisma/client";

import type { ChargePaymentDto } from "../dto";
import { EpointPaymentProvider } from "../providers/epoint-payment.provider";
import { KapitalPaymentProvider } from "../providers/kapital-payment.provider";
import { MockPaymentProvider } from "../providers/mock-payment.provider";
import { PaymentsRepository } from "../repository/payments.repository";
import { toPublicGatewayRef } from "../utils/payment-reference.util";

import { BalanceService } from "./balance.service";

import { PrismaService } from "@/database/database.module";
import { DomainBillingService } from "@/modules/domains/service/domain-billing.service";
import { HostingBillingService } from "@/modules/hosting/service/hosting-billing.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { decryptSecret, encryptSecret, hashToken } from "@/utils/crypto.util";

const PAYMENT_PROVIDER_SETTING_KEY = "payment_provider";

function mapPaymentMethod(method: {
  id: string;
  type: string;
  label: string;
  last4: string | null;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  provider: string | null;
  status: PaymentMethodStatus;
  createdAt: Date;
}) {
  return {
    id: method.id,
    type: method.type,
    label: method.label,
    last4: method.last4,
    brand: method.brand,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    isDefault: method.isDefault,
    provider: method.provider,
    status: method.status,
    createdAt: method.createdAt,
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly mockGateway: MockPaymentProvider,
    private readonly kapitalGateway: KapitalPaymentProvider,
    private readonly epointGateway: EpointPaymentProvider,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly hostingBilling: HostingBillingService,
    private readonly domainBilling: DomainBillingService,
    private readonly balanceService: BalanceService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private envProvider(): "mock" | "kapital" | "epoint" {
    const value = this.configService.get<{ provider: string }>("payment")?.provider;
    return value === "kapital" || value === "epoint" ? value : "mock";
  }

  /** DB admin override wins; otherwise env PAYMENT_PROVIDER. */
  private async resolveProvider(): Promise<"mock" | "kapital" | "epoint"> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: PAYMENT_PROVIDER_SETTING_KEY },
    });
    const raw = setting?.value?.toLowerCase().trim();
    if (raw === "kapital") return "kapital";
    if (raw === "epoint") return "epoint";
    if (raw === "mock") return "mock";
    return this.envProvider();
  }

  async listMethods(userId: string) {
    const methods = await this.paymentsRepository.findMethodsByUserId(userId);
    return methods.map(mapPaymentMethod);
  }

  async registerEpointCard(userId: string, clientIp?: string) {
    if (!this.epointGateway.isConfigured()) {
      throw new BadRequestException("Epoint payment is not configured");
    }

    let registration: { cardId: string; redirectUrl: string };
    try {
      registration = await this.epointGateway.registerCard("Vexira Host avtomatik yenilənmə kartı");
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Epoint error");
    }

    const method = await this.prisma.paymentMethod.create({
      data: {
        userId,
        label: "Epoint card",
        provider: "epoint",
        providerTokenEnc: encryptSecret(registration.cardId),
        providerTokenHash: hashToken(registration.cardId),
        status: PaymentMethodStatus.PENDING,
        consentIp: clientIp,
        consentVersion: "epoint-recurring-v1",
      },
    });

    return { methodId: method.id, redirectUrl: registration.redirectUrl };
  }

  async setDefaultMethod(userId: string, methodId: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id: methodId, userId, status: PaymentMethodStatus.ACTIVE },
    });
    if (!method) throw new NotFoundException("Active payment method not found");

    await this.prisma.$transaction([
      this.prisma.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.paymentMethod.update({ where: { id: methodId }, data: { isDefault: true } }),
    ]);
    return { ok: true };
  }

  async disableMethod(userId: string, methodId: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id: methodId, userId },
    });
    if (!method) throw new NotFoundException("Payment method not found");

    await this.prisma.paymentMethod.update({
      where: { id: method.id },
      data: {
        status: PaymentMethodStatus.REVOKED,
        isDefault: false,
        providerTokenEnc: null,
      },
    });
    return { ok: true };
  }

  async charge(userId: string, dto: ChargePaymentDto) {
    const invoice = await this.paymentsRepository.findInvoiceForUser(dto.invoiceId, userId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return this.completeAlreadyPaidInvoice(invoice);
    }

    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException("Invoice is not payable");
    }

    if (dto.useBalance) {
      return this.balanceService.payInvoiceWithBalance(userId, dto.invoiceId, dto.amount);
    }

    let selectedMethod = null;
    if (dto.methodId) {
      selectedMethod = await this.paymentsRepository.findMethodByIdForUser(dto.methodId, userId);
      if (!selectedMethod) {
        throw new NotFoundException("Payment method not found");
      }
      if (selectedMethod.status !== PaymentMethodStatus.ACTIVE) {
        throw new BadRequestException("Payment method is not active");
      }
    }

    const alreadyPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountDue = Math.max(0, Number((Number(invoice.total) - alreadyPaid).toFixed(2)));
    if (amountDue <= 0) {
      return this.completeZeroAmountInvoice(userId, invoice);
    }

    const provider = await this.resolveProvider();

    if (selectedMethod?.provider === "epoint" || provider === "epoint") {
      return this.chargeViaEpoint(userId, invoice, amountDue, selectedMethod ?? undefined);
    }

    if (provider === "kapital") {
      return this.chargeViaKapital(userId, invoice, amountDue, dto.methodId);
    }

    return this.chargeViaMock(userId, invoice, amountDue, dto.methodId);
  }

  private async completeAlreadyPaidInvoice(invoice: {
    id: string;
    orderId: string | null;
    currency: string;
  }) {
    if (invoice.orderId) {
      await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
    } else {
      await this.hostingBilling.activateAfterRenewalPayment(invoice.id);
      await this.domainBilling.activateAfterRenewalPayment(invoice.id);
    }

    return {
      mode: "completed" as const,
      id: null,
      status: PaymentStatus.COMPLETED,
      amount: 0,
      currency: invoice.currency,
      gatewayRef: null,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      method: null,
      createdAt: new Date(),
    };
  }

  private async completeZeroAmountInvoice(
    userId: string,
    invoice: {
      id: string;
      orderId: string | null;
      currency: string;
    },
  ) {
    const payment = await this.paymentsRepository.completeZeroAmountInvoice({
      userId,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      currency: invoice.currency,
    });

    if (invoice.orderId) {
      await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
    } else {
      await this.hostingBilling.activateAfterRenewalPayment(invoice.id);
      await this.domainBilling.activateAfterRenewalPayment(invoice.id);
    }

    return {
      mode: "completed" as const,
      id: payment.id,
      status: payment.status,
      amount: 0,
      currency: payment.currency,
      gatewayRef: toPublicGatewayRef(payment.gatewayRef),
      invoiceId: payment.invoiceId,
      orderId: invoice.orderId,
      method: payment.method ? mapPaymentMethod(payment.method) : null,
      createdAt: payment.createdAt,
    };
  }

  getBalance(userId: string) {
    return this.balanceService.getBalance(userId);
  }

  private async chargeViaMock(
    userId: string,
    invoice: {
      id: string;
      orderId: string | null;
      total: { toString(): string };
      currency: string;
    },
    amount: number,
    methodId?: string,
  ) {
    const chargeAmount = new Prisma.Decimal(amount.toFixed(2));

    const result = await this.mockGateway.charge({
      amount,
      currency: invoice.currency,
      invoiceId: invoice.id,
      methodId,
    });

    if (!result.success) {
      const failed = await this.paymentsRepository.recordFailedPayment({
        userId,
        invoiceId: invoice.id,
        methodId,
        amount: chargeAmount,
        currency: invoice.currency,
        failureReason: result.failureReason ?? "Payment declined",
      });

      throw new BadRequestException({
        message: result.failureReason ?? "Payment declined",
        paymentId: failed.id,
      });
    }

    const payment = await this.paymentsRepository.completePayment({
      userId,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      methodId,
      amount: chargeAmount,
      currency: invoice.currency,
      gatewayRef: result.gatewayRef,
    });

    if (invoice.orderId) {
      await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
    } else {
      await this.hostingBilling.activateAfterRenewalPayment(invoice.id);
      await this.domainBilling.activateAfterRenewalPayment(invoice.id);
    }

    return {
      mode: "completed" as const,
      id: payment.id,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      gatewayRef: toPublicGatewayRef(payment.gatewayRef),
      invoiceId: payment.invoiceId,
      orderId: invoice.orderId,
      method: payment.method ? mapPaymentMethod(payment.method) : null,
      createdAt: payment.createdAt,
    };
  }

  private assertEpointCurrency(currency: string): void {
    if (currency.toUpperCase() !== "AZN") {
      throw new BadRequestException("Epoint currently supports AZN payments only");
    }
  }

  private epointSucceeded(result: { status?: string; code?: string }): boolean {
    const status = result.status?.toLowerCase();
    return status === "success" && (!result.code || result.code === "000");
  }

  private async fulfillPaidInvoice(invoiceId: string, orderId: string | null): Promise<void> {
    if (orderId) {
      await this.orderFulfillmentService.fulfillOrder(orderId);
    } else {
      await this.hostingBilling.activateAfterRenewalPayment(invoiceId);
      await this.domainBilling.activateAfterRenewalPayment(invoiceId);
    }
  }

  private async chargeViaEpoint(
    userId: string,
    invoice: {
      id: string;
      orderId: string | null;
      invoiceNumber: string;
      currency: string;
    },
    amount: number,
    method?: {
      id: string;
      provider: string | null;
      providerTokenEnc: string | null;
      status: PaymentMethodStatus;
    },
  ) {
    this.assertEpointCurrency(invoice.currency);
    if (!this.epointGateway.isConfigured()) {
      throw new BadRequestException("Epoint payment is not configured");
    }

    if (!method) {
      let created: { transaction: string; redirectUrl: string };
      try {
        created = await this.epointGateway.createPayment({
          orderId: `${invoice.invoiceNumber}-${Date.now()}`.slice(0, 255),
          amount,
          description: `Invoice ${invoice.invoiceNumber}`,
        });
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : "Epoint error");
      }
      const pending = await this.paymentsRepository.createPendingPayment({
        userId,
        invoiceId: invoice.id,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        currency: "AZN",
        gatewayRef: `epoint:${created.transaction}`,
      });
      return {
        mode: "redirect" as const,
        id: pending.id,
        status: pending.status,
        amount,
        currency: "AZN",
        gatewayRef: `epoint:${created.transaction}`,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        redirectUrl: created.redirectUrl,
        createdAt: pending.createdAt,
      };
    }

    if (method.provider !== "epoint" || !method.providerTokenEnc) {
      throw new BadRequestException("This payment method cannot be charged by Epoint");
    }

    const chargeAmount = new Prisma.Decimal(amount.toFixed(2));
    const orderId = `${invoice.invoiceNumber}-${Date.now()}`.slice(0, 255);
    const pending = await this.paymentsRepository.createPendingPayment({
      userId,
      invoiceId: invoice.id,
      methodId: method.id,
      amount: chargeAmount,
      currency: "AZN",
      gatewayRef: `epoint:auto:${orderId}`,
    });

    let result;
    try {
      result = await this.epointGateway.executeSavedCard({
        cardId: decryptSecret(method.providerTokenEnc),
        orderId,
        amount,
        description: `Invoice ${invoice.invoiceNumber}`,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Epoint payment failed";
      await this.paymentsRepository.failPendingPayment(pending.id, reason);
      throw new BadRequestException(reason);
    }

    if (!this.epointSucceeded(result) || !result.transaction) {
      const reason = result.message || result.bank_response || "Epoint payment declined";
      await this.paymentsRepository.failPendingPayment(pending.id, reason);
      throw new BadRequestException(reason);
    }

    await this.prisma.payment.update({
      where: { id: pending.id },
      data: { gatewayRef: `epoint:${result.transaction}` },
    });
    const payment = await this.paymentsRepository.completePendingPayment({
      paymentId: pending.id,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
    });
    await this.prisma.paymentMethod.update({
      where: { id: method.id },
      data: { lastUsedAt: new Date(), failureReason: null },
    });
    await this.fulfillPaidInvoice(invoice.id, invoice.orderId);

    return {
      mode: "completed" as const,
      id: payment.id,
      status: payment.status,
      amount,
      currency: "AZN",
      gatewayRef: `epoint:${result.transaction}`,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      method: payment.method ? mapPaymentMethod(payment.method) : null,
      createdAt: payment.createdAt,
    };
  }

  async tryEpointAutoRenewal(userId: string, invoiceId: string): Promise<boolean> {
    if (!this.epointGateway.isConfigured()) return false;
    const invoice = await this.paymentsRepository.findInvoiceForUser(invoiceId, userId);
    if (!invoice || invoice.status !== InvoiceStatus.OPEN || invoice.currency !== "AZN")
      return false;

    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        provider: "epoint",
        status: PaymentMethodStatus.ACTIVE,
        providerTokenEnc: { not: null },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    if (!method) return false;

    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const amountDue = Math.max(0, Number((Number(invoice.total) - paid).toFixed(2)));
    if (amountDue <= 0) return true;

    try {
      await this.chargeViaEpoint(userId, invoice, amountDue, method);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Epoint payment failed";
      await this.prisma.paymentMethod.update({
        where: { id: method.id },
        data: { failureReason: reason },
      });
      this.logger.warn(`Epoint auto-renewal failed for invoice ${invoiceId}: ${reason}`);
      return false;
    }
  }

  async handleEpointCallback(data: string, signature: string) {
    let payload;
    try {
      payload = this.epointGateway.decodeAndVerifyCallback(data, signature);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid callback");
    }

    if (String(payload.operation_code ?? "") === "001" && payload.card_id) {
      const method = await this.prisma.paymentMethod.findUnique({
        where: { providerTokenHash: hashToken(payload.card_id) },
      });
      if (!method) return { ok: false, reason: "method_not_found" };

      if (!this.epointSucceeded(payload)) {
        await this.prisma.paymentMethod.update({
          where: { id: method.id },
          data: {
            status: PaymentMethodStatus.FAILED,
            failureReason: payload.message || payload.bank_response || "Card registration failed",
          },
        });
        return { ok: false, reason: "registration_failed" };
      }

      const digits = payload.card_mask?.replace(/\D/g, "") ?? "";
      const last4 = digits.length >= 4 ? digits.slice(-4) : null;
      const brand = digits.startsWith("4")
        ? "Visa"
        : digits.startsWith("5") || digits.startsWith("2")
          ? "Mastercard"
          : "Card";
      const activeCount = await this.prisma.paymentMethod.count({
        where: {
          userId: method.userId,
          provider: "epoint",
          status: PaymentMethodStatus.ACTIVE,
          id: { not: method.id },
        },
      });
      await this.prisma.paymentMethod.update({
        where: { id: method.id },
        data: {
          status: PaymentMethodStatus.ACTIVE,
          label: `${brand} •••• ${last4 ?? "card"}`,
          brand,
          last4,
          isDefault: activeCount === 0,
          consentAt: new Date(),
          failureReason: null,
        },
      });
      return { ok: true, type: "card_registration" };
    }

    if (!payload.transaction) return { ok: false, reason: "transaction_missing" };
    const pending = await this.paymentsRepository.findPendingByGatewayRef(
      `epoint:${payload.transaction}`,
    );
    if (!pending) return { ok: true, reason: "already_processed_or_not_found" };
    if (!this.epointSucceeded(payload)) {
      await this.paymentsRepository.failPendingPayment(
        pending.id,
        payload.message || payload.bank_response || "Epoint payment failed",
      );
      return { ok: false, reason: "payment_failed" };
    }

    await this.paymentsRepository.completePendingPayment({
      paymentId: pending.id,
      invoiceId: pending.invoiceId,
      orderId: pending.invoice.orderId,
    });
    await this.fulfillPaidInvoice(pending.invoiceId, pending.invoice.orderId);
    return { ok: true, type: "payment" };
  }

  private async chargeViaKapital(
    userId: string,
    invoice: {
      id: string;
      orderId: string | null;
      invoiceNumber: string;
      total: { toString(): string };
      currency: string;
    },
    amount: number,
    methodId?: string,
  ) {
    if (!(await this.kapitalGateway.isConfigured())) {
      throw new BadRequestException("Kapital Bank payment is not configured");
    }

    const chargeAmount = new Prisma.Decimal(amount.toFixed(2));

    let created;
    try {
      created = await this.kapitalGateway.createPurchaseOrder({
        amount,
        currency: invoice.currency,
        description: `Invoice ${invoice.invoiceNumber}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kapital Bank error";
      await this.paymentsRepository.recordFailedPayment({
        userId,
        invoiceId: invoice.id,
        methodId,
        amount: chargeAmount,
        currency: invoice.currency,
        failureReason: message,
      });
      throw new BadRequestException(message);
    }

    const gatewayRef = this.kapitalGateway.encodeGatewayRef(created.id, created.password);
    const pending = await this.paymentsRepository.createPendingPayment({
      userId,
      invoiceId: invoice.id,
      methodId,
      amount: chargeAmount,
      currency: invoice.currency,
      gatewayRef,
    });

    return {
      mode: "redirect" as const,
      id: pending.id,
      status: pending.status,
      amount,
      currency: invoice.currency,
      gatewayRef: toPublicGatewayRef(gatewayRef),
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      redirectUrl: created.redirectUrl,
      createdAt: pending.createdAt,
    };
  }

  /**
   * Kapital HPP callback: verify order status via API, then complete + fulfill.
   * Never trust STATUS query alone.
   */
  async handleKapitalCallback(kapitalOrderId: string, statusHint?: string) {
    const prefix = `kapital:${kapitalOrderId}:`;
    const pending = await this.paymentsRepository.findPendingByGatewayRefPrefix(prefix);
    if (!pending?.gatewayRef) {
      this.logger.warn(`Kapital callback: no pending payment for order ${kapitalOrderId}`);
      return {
        ok: false,
        reason: "payment_not_found",
        orderId: null as string | null,
        invoiceId: null as string | null,
      };
    }

    const parsed = this.kapitalGateway.parseGatewayRef(pending.gatewayRef);
    if (!parsed) {
      return {
        ok: false,
        reason: "invalid_gateway_ref",
        orderId: pending.invoice.orderId,
        invoiceId: pending.invoiceId,
      };
    }

    let bankStatus: string;
    try {
      const remote = await this.kapitalGateway.getOrderStatus(
        parsed.kapitalOrderId,
        parsed.password,
      );
      bankStatus = remote.status;
    } catch (error) {
      this.logger.error(
        `Kapital status check failed for ${kapitalOrderId}: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      return {
        ok: false,
        reason: "status_check_failed",
        orderId: pending.invoice.orderId,
        invoiceId: pending.invoiceId,
      };
    }

    if (!this.kapitalGateway.isPaidStatus(bankStatus)) {
      this.logger.warn(
        `Kapital order ${kapitalOrderId} not paid (status=${bankStatus}, hint=${statusHint ?? "-"})`,
      );

      let declineReason: string | undefined;
      try {
        const detailed = await this.kapitalGateway.getDetailedOrderStatus(
          parsed.kapitalOrderId,
          parsed.password,
        );
        declineReason = detailed.declineReason;
      } catch {
        // optional enrichment
      }

      if (
        ["Cancelled", "Canceled", "Declined", "Expired", "Refused", "Rejected"].includes(bankStatus)
      ) {
        await this.paymentsRepository.failPendingPayment(
          pending.id,
          declineReason
            ? `Kapital status: ${bankStatus} (${declineReason})`
            : `Kapital status: ${bankStatus}`,
        );
      }
      return {
        ok: false,
        reason: declineReason ? `not_paid:${declineReason}` : "not_paid",
        bankStatus,
        orderId: pending.invoice.orderId,
        invoiceId: pending.invoiceId,
      };
    }

    if (pending.invoice.status === InvoiceStatus.PAID) {
      return {
        ok: true,
        reason: "already_paid",
        orderId: pending.invoice.orderId,
        invoiceId: pending.invoiceId,
      };
    }

    await this.paymentsRepository.completePendingPayment({
      paymentId: pending.id,
      invoiceId: pending.invoiceId,
      orderId: pending.invoice.orderId,
    });

    if (pending.invoice.orderId) {
      await this.orderFulfillmentService.fulfillOrder(pending.invoice.orderId);
    } else {
      await this.hostingBilling.activateAfterRenewalPayment(pending.invoiceId);
      await this.domainBilling.activateAfterRenewalPayment(pending.invoiceId);
    }

    return {
      ok: true,
      reason: "completed",
      orderId: pending.invoice.orderId,
      invoiceId: pending.invoiceId,
    };
  }

  async getKapitalReturnUrl(): Promise<string> {
    return this.kapitalGateway.getReturnUrl();
  }
}
