import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvoiceStatus } from "@prisma/client";

import type { ChargePaymentDto, CreatePaymentMethodDto } from "../dto";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { PrismaService } from "@/database/database.module";
import { KapitalPaymentProvider } from "../providers/kapital-payment.provider";
import { MockPaymentProvider } from "../providers/mock-payment.provider";
import { PaymentsRepository } from "../repository/payments.repository";

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
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private envProvider(): "mock" | "kapital" {
    const value = this.configService.get<{ provider: string }>("payment")?.provider;
    return value === "kapital" ? "kapital" : "mock";
  }

  /** DB admin override wins; otherwise env PAYMENT_PROVIDER. */
  private async resolveProvider(): Promise<"mock" | "kapital"> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: PAYMENT_PROVIDER_SETTING_KEY },
    });
    const raw = setting?.value?.toLowerCase().trim();
    if (raw === "kapital") return "kapital";
    if (raw === "mock") return "mock";
    return this.envProvider();
  }

  async listMethods(userId: string) {
    const methods = await this.paymentsRepository.findMethodsByUserId(userId);
    return methods.map(mapPaymentMethod);
  }

  async createMethod(userId: string, dto: CreatePaymentMethodDto) {
    const method = await this.paymentsRepository.createMethod({
      userId,
      type: dto.type,
      label: dto.label,
      last4: dto.last4,
      brand: dto.brand,
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
      isDefault: dto.isDefault,
    });

    return mapPaymentMethod(method);
  }

  async charge(userId: string, dto: ChargePaymentDto) {
    const invoice = await this.paymentsRepository.findInvoiceForUser(dto.invoiceId, userId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException("Invoice is not payable");
    }

    if (dto.methodId) {
      const method = await this.paymentsRepository.findMethodByIdForUser(dto.methodId, userId);
      if (!method) {
        throw new NotFoundException("Payment method not found");
      }
    }

    const amount = Number(invoice.total);
    const provider = await this.resolveProvider();

    if (provider === "kapital") {
      return this.chargeViaKapital(userId, invoice, amount, dto.methodId);
    }

    return this.chargeViaMock(userId, invoice, amount, dto.methodId);
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
        amount: invoice.total as never,
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
      amount: invoice.total as never,
      currency: invoice.currency,
      gatewayRef: result.gatewayRef,
    });

    if (invoice.orderId) {
      await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
    }

    return {
      mode: "completed" as const,
      id: payment.id,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      gatewayRef: payment.gatewayRef,
      invoiceId: payment.invoiceId,
      orderId: invoice.orderId,
      method: payment.method ? mapPaymentMethod(payment.method) : null,
      createdAt: payment.createdAt,
    };
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
        amount: invoice.total as never,
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
      amount: invoice.total as never,
      currency: invoice.currency,
      gatewayRef,
    });

    return {
      mode: "redirect" as const,
      id: pending.id,
      status: pending.status,
      amount,
      currency: invoice.currency,
      gatewayRef,
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
        ["Cancelled", "Canceled", "Declined", "Expired", "Refused", "Rejected"].includes(
          bankStatus,
        )
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
