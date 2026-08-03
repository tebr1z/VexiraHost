import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { CheckoutDto, ValidatePromoDto } from "../dto";
import { OrdersRepository } from "../repository/orders.repository";

import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";
import { parseCurrency, parsePeriod } from "@/shared/pricing/currency.util";
import { resolveProductPrice } from "@/shared/pricing/product-price.util";
import {
  computePromoDiscount,
  normalizePromoCode,
  type PromoCodeLike,
  type PromoEvalResult,
} from "@/shared/pricing/promo.util";

function generateInvoiceNumber(): string {
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${Date.now()}-${suffix}`;
}

function mapOrderItem(item: {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Decimal;
  totalPrice: Decimal;
  metadata?: unknown;
}) {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
    metadata: item.metadata ?? null,
  };
}

function mapOrder(order: {
  id: string;
  status: string;
  subtotal: Decimal;
  discountAmount?: Decimal;
  total: Decimal;
  currency: string;
  promoCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: Decimal;
    totalPrice: Decimal;
    metadata?: unknown;
  }[];
  invoices?: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: Decimal;
    dueDate: Date;
  }[];
  hostingAccounts?: {
    id: string;
    primaryDomain: string;
    status: string;
    panelUrl: string | null;
    provisionedAt: Date | null;
    provisionStage: string | null;
    provisionError: string | null;
  }[];
}) {
  const invoice = order.invoices?.[0];

  return {
    id: order.id,
    status: order.status,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount ?? 0),
    total: Number(order.total),
    currency: order.currency,
    promoCode: order.promoCode ?? null,
    items: order.items.map(mapOrderItem),
    invoice: invoice
      ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: Number(invoice.total),
          dueDate: invoice.dueDate,
        }
      : null,
    hostingAccounts: (order.hostingAccounts ?? []).map((account) => ({
      id: account.id,
      primaryDomain: account.primaryDomain,
      status: account.status,
      panelUrl: account.panelUrl,
      provisionedAt: account.provisionedAt,
      provisionStage: account.provisionStage,
      provisionError: account.provisionError,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function toPromoLike(row: {
  id: string;
  code: string;
  type: string;
  value: Decimal;
  currency: string | null;
  maxDiscountAmount: Decimal | null;
  minOrderAmount: Decimal | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  appliesToAll: boolean;
  productIds: string[];
  categories: string[];
}): PromoCodeLike {
  return {
    ...row,
    type: row.type === "FIXED" ? "FIXED" : "PERCENT",
  };
}

function mapPromoResponse(result: PromoEvalResult) {
  return {
    valid: result.valid,
    discountAmount: Number(result.discountAmount),
    code: result.promo?.code ?? null,
    messageKey: result.messageKey,
    messageParams: result.messageParams,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  private async buildLineItems(userId: string | null, dto: CheckoutDto | ValidatePromoDto) {
    const merged = new Map<string, number>();
    for (const item of dto.items) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    }

    const productIds = [...merged.keys()];
    const products = await this.ordersRepository.findActiveProductsByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more products are invalid or inactive");
    }

    const user = userId ? await this.authRepository.findById(userId) : null;
    const currency = parseCurrency(
      dto.currency ?? user?.preferredCurrency ?? products[0]?.currency,
    );
    const period = parsePeriod(dto.period ?? user?.billingPeriod);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const lineItems = productIds.map((productId) => {
      const product = productMap.get(productId)!;
      const quantity = merged.get(productId)!;
      const resolved = resolveProductPrice(product.prices, currency, period);
      const unitPrice = new Decimal(resolved?.salePrice ?? Number(product.price));
      const totalPrice = unitPrice.mul(quantity);
      const checkoutItem = dto.items.find((item) => item.productId === productId);

      return {
        productId,
        quantity,
        unitPrice,
        totalPrice,
        productName: product.name,
        category: product.category,
        metadata: {
          ...(checkoutItem?.metadata ?? {}),
          currency: resolved?.currency ?? currency,
          period: resolved?.period ?? period,
          originalPrice: resolved?.originalPrice,
        } as Prisma.InputJsonValue,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum.add(item.totalPrice), new Decimal(0));

    return { lineItems, subtotal, currency, period };
  }

  private async evaluatePromo(
    code: string | undefined,
    userId: string | null,
    lineItems: { productId: string; category: string; totalPrice: Decimal }[],
    subtotal: Decimal,
    currency: string,
  ): Promise<PromoEvalResult> {
    if (!code?.trim()) {
      return {
        valid: false,
        discountAmount: new Decimal(0),
        messageKey: "not_found",
        messageParams: {},
        promo: null,
      };
    }

    const row = await this.ordersRepository.findPromoByCode(normalizePromoCode(code));
    if (!row) {
      return {
        valid: false,
        discountAmount: new Decimal(0),
        messageKey: "not_found",
        messageParams: { code: normalizePromoCode(code) },
        promo: null,
      };
    }

    const promo = toPromoLike(row);
    const [totalRedemptions, userRedemptions] = await Promise.all([
      this.ordersRepository.countPromoRedemptions(promo.id),
      userId
        ? this.ordersRepository.countUserPromoRedemptions(promo.id, userId)
        : Promise.resolve(0),
    ]);

    return computePromoDiscount(promo, lineItems, subtotal, currency, {
      totalRedemptions,
      userRedemptions,
    });
  }

  async validatePromo(userId: string | null, dto: ValidatePromoDto) {
    const { lineItems, subtotal, currency } = await this.buildLineItems(userId, dto);
    const result = await this.evaluatePromo(dto.code, userId, lineItems, subtotal, currency);
    return mapPromoResponse(result);
  }

  async checkout(userId: string, dto: CheckoutDto) {
    const { lineItems, subtotal, currency } = await this.buildLineItems(userId, dto);

    let discountAmount = new Decimal(0);
    let promoCodeId: string | null = null;
    let promoCode: string | null = null;

    if (dto.promoCode?.trim()) {
      const result = await this.evaluatePromo(dto.promoCode, userId, lineItems, subtotal, currency);
      if (!result.valid || !result.promo) {
        throw new BadRequestException({
          message: "Promo code could not be applied",
          messageKey: result.messageKey,
          messageParams: result.messageParams,
        });
      }
      discountAmount = result.discountAmount;
      promoCodeId = result.promo.id;
      promoCode = result.promo.code;
    }

    const total = Decimal.max(subtotal.sub(discountAmount), new Decimal(0));
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const order = await this.ordersRepository.createCheckout({
      userId,
      subtotal,
      discountAmount,
      total,
      currency,
      promoCodeId,
      promoCode,
      items: lineItems.map(({ category: _c, ...item }) => item),
      invoiceNumber: generateInvoiceNumber(),
      dueDate,
    });

    const addressFromItems = dto.items
      .map((item) =>
        normalizeBillingAddress(
          (item.metadata as { billingAddress?: unknown } | undefined)?.billingAddress,
        ),
      )
      .find(Boolean);
    if (addressFromItems) {
      await this.authRepository.updateBillingAddress(userId, addressFromItems);
    }

    return mapOrder(order);
  }

  async listForUser(userId: string) {
    const orders = await this.ordersRepository.findByUserId(userId);
    return orders.map(mapOrder);
  }

  async getForUser(id: string, userId: string) {
    const order = await this.ordersRepository.findByIdForUser(id, userId);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return mapOrder(order);
  }
}
