import { Injectable, NotFoundException } from "@nestjs/common";
import type { Decimal } from "@prisma/client/runtime/library";

import { BillingRepository } from "../repository/billing.repository";
import { buildInvoicePdf } from "../utils/invoice-pdf.util";
function mapInvoiceItem(item: {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: Decimal;
  totalPrice: Decimal;
}) {
  return {
    id: item.id,
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
  };
}

function mapInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: Decimal;
  total: Decimal;
  currency: string;
  dueDate: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    productId: string | null;
    description: string;
    quantity: number;
    unitPrice: Decimal;
    totalPrice: Decimal;
  }[];
  order?: { id: string; status: string } | null;
  payments?: {
    id: string;
    status: string;
    amount: Decimal;
    gatewayRef: string | null;
    createdAt: Date;
  }[];
}) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    subtotal: Number(invoice.subtotal),
    total: Number(invoice.total),
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    order: invoice.order ?? null,
    items: invoice.items.map(mapInvoiceItem),
    payments: invoice.payments?.map((payment) => ({
      id: payment.id,
      status: payment.status,
      amount: Number(payment.amount),
      gatewayRef: payment.gatewayRef,
      createdAt: payment.createdAt,
    })),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

@Injectable()
export class BillingService {
  constructor(private readonly billingRepository: BillingRepository) {}

  async listInvoices(userId: string) {
    const invoices = await this.billingRepository.findInvoicesByUserId(userId);
    return invoices.map((invoice) => mapInvoice(invoice));
  }

  async getInvoice(id: string, userId: string) {
    const invoice = await this.billingRepository.findInvoiceByIdForUser(id, userId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    return mapInvoice(invoice);
  }

  async getInvoicePdf(id: string, userId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const invoice = await this.billingRepository.findInvoiceByIdForUser(id, userId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const customerName = [invoice.user.firstName, invoice.user.lastName].filter(Boolean).join(" ");
    const buffer = buildInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      total: Number(invoice.total),
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      customerEmail: invoice.user.email,
      customerName,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      createdAt: invoice.createdAt,
    });

    return { buffer, fileName: `${invoice.invoiceNumber}.pdf` };
  }
}
