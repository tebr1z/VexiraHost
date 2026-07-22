import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { normalizeBillingAddress } from "@/shared/billing/billing-address.util";
import { parseCurrency, parsePeriod } from "@/shared/pricing/currency.util";
import { resolveProductPrice } from "@/shared/pricing/product-price.util";

import type { CheckoutDto } from "../dto";
import { OrdersRepository } from "../repository/orders.repository";

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
  total: Decimal;
  currency: string;
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
    total: Number(order.total),
    currency: order.currency,
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

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const merged = new Map<string, number>();
    for (const item of dto.items) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    }

    const productIds = [...merged.keys()];
    const products = await this.ordersRepository.findActiveProductsByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more products are invalid or inactive");
    }

    const user = await this.authRepository.findById(userId);
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
        metadata: {
          ...(checkoutItem?.metadata ?? {}),
          currency: resolved?.currency ?? currency,
          period: resolved?.period ?? period,
          originalPrice: resolved?.originalPrice,
        } as Prisma.InputJsonValue,
      };
    });

    const subtotal = lineItems.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Decimal(0),
    );
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const order = await this.ordersRepository.createCheckout({
      userId,
      subtotal,
      total: subtotal,
      currency,
      items: lineItems,
      invoiceNumber: generateInvoiceNumber(),
      dueDate,
    });

    const addressFromItems = dto.items
      .map((item) => normalizeBillingAddress((item.metadata as { billingAddress?: unknown } | undefined)?.billingAddress))
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
