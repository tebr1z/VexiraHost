import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { OrderStatus } from "@prisma/client";
import type { AuthUser } from "@vexira/types";
import bcrypt from "bcryptjs";

import { AuthService } from "@/modules/auth/service/auth.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { PaymentsRepository } from "@/modules/payments/repository/payments.repository";
import { parseCurrency, parsePeriod } from "@/shared/pricing/currency.util";
import { mapAppRoleToPrisma, mapPrismaRoleToApp } from "@/utils/role.util";

import type { UpdateAdminUserDto, UpdateAdminUserRoleDto, UpdateAdminUserStatusDto } from "../dto";
import { AdminRepository } from "../repository/admin.repository";
import { AdminPaymentsRepository } from "../service/admin-system.service";
import { InvoiceStatus } from "@prisma/client";

const BCRYPT_ROUNDS = 12;

function mapOrderItem(item: {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: { toNumber?: () => number } | number;
  totalPrice: { toNumber?: () => number } | number;
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

function mapCustomer(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function mapAdminUser(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  preferredCurrency: string | null;
  billingPeriod: string | null;
  currencyChangedAt: Date | null;
  currencyLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { orders: number; tickets: number; invoices: number };
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: mapPrismaRoleToApp(user.role),
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    preferredCurrency: user.preferredCurrency,
    billingPeriod: user.billingPeriod,
    currencyChangedAt: user.currencyChangedAt?.toISOString() ?? null,
    currencyLocked: user.currencyLocked,
    orderCount: user._count.orders,
    ticketCount: user._count.tickets,
    invoiceCount: user._count.invoices,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mapHostingAccount(account: {
  id: string;
  primaryDomain: string;
  status: string;
  panelUrl: string | null;
  provisionedAt: Date | null;
}) {
  return {
    id: account.id,
    primaryDomain: account.primaryDomain,
    status: account.status,
    panelUrl: account.panelUrl,
    provisionedAt: account.provisionedAt,
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly adminPaymentsRepository: AdminPaymentsRepository,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly authService: AuthService,
  ) {}

  async getDashboard() {
    const [
      activeUsers,
      totalOrders,
      openInvoices,
      openTickets,
      revenueAggregate,
      recentOrders,
      recentTickets,
    ] = await this.adminRepository.getDashboardStats();

    return {
      stats: {
        activeUsers,
        totalOrders,
        openInvoices,
        openTickets,
        totalRevenue: Number(revenueAggregate._sum.amount ?? 0),
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        currency: order.currency,
        customerEmail: order.user.email,
        createdAt: order.createdAt,
      })),
      recentTickets: recentTickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        customerEmail: ticket.user.email,
        updatedAt: ticket.updatedAt,
      })),
    };
  }

  async listUsers() {
    const users = await this.adminRepository.listUsers();
    return users.map(mapAdminUser);
  }

  async getUser(userId: string) {
    const user = await this.adminRepository.findUserById(userId);
    if (!user) throw new NotFoundException("User not found");
    return mapAdminUser(user);
  }

  async updateUser(actor: AuthUser, userId: string, dto: UpdateAdminUserDto) {
    const user = await this.adminRepository.findUserById(userId);
    if (!user) throw new NotFoundException("User not found");

    if (actor.id === userId) {
      if (dto.role && dto.role !== mapPrismaRoleToApp(user.role)) {
        throw new ForbiddenException("You cannot change your own role");
      }
      if (dto.status && dto.status !== user.status) {
        throw new ForbiddenException("You cannot change your own account status");
      }
    }

    if (dto.email) {
      const normalized = dto.email.trim().toLowerCase();
      const conflict = await this.adminRepository.findUserEmailConflict(normalized, userId);
      if (conflict) {
        throw new ConflictException("An account with this email already exists");
      }
    }

    const data: Parameters<AdminRepository["updateUser"]>[1] = {};

    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim() || null;
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim() || null;
    if (dto.role !== undefined) data.role = mapAppRoleToPrisma(dto.role);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.preferredCurrency !== undefined) {
      data.preferredCurrency = parseCurrency(dto.preferredCurrency);
    }
    if (dto.billingPeriod !== undefined) {
      data.billingPeriod = parsePeriod(dto.billingPeriod);
    }
    if (dto.currencyLocked !== undefined) data.currencyLocked = dto.currencyLocked;
    if (dto.emailVerified !== undefined) {
      data.emailVerifiedAt = dto.emailVerified ? (user.emailVerifiedAt ?? new Date()) : null;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (Object.keys(data).length === 0) {
      return mapAdminUser(user);
    }

    const updated = await this.adminRepository.updateUser(userId, data);
    return mapAdminUser(updated);
  }

  async updateUserRole(actor: AuthUser, userId: string, dto: UpdateAdminUserRoleDto) {
    return this.updateUser(actor, userId, { role: dto.role });
  }

  async updateUserStatus(actor: AuthUser, userId: string, dto: UpdateAdminUserStatusDto) {
    return this.updateUser(actor, userId, { status: dto.status });
  }

  impersonateUser(
    actor: AuthUser,
    targetUserId: string,
    meta?: { userAgent?: string; ip?: string },
  ) {
    return this.authService.impersonateUser(actor, targetUserId, meta);
  }

  async listOrders(filters?: { status?: string; search?: string }) {
    const status = filters?.status?.toUpperCase() as OrderStatus | undefined;
    if (status && !["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].includes(status)) {
      throw new BadRequestException("Invalid order status filter");
    }

    const orders = await this.adminRepository.listOrders({
      status,
      search: filters?.search,
    });

    return orders.map((order) => {
      const invoice = order.invoices[0];
      return {
        id: order.id,
        status: order.status,
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        currency: order.currency,
        customer: mapCustomer(order.user),
        items: order.items.map(mapOrderItem),
        invoice: invoice
          ? {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              total: Number(invoice.total),
            }
          : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });
  }

  async getOrder(id: string) {
    const order = await this.adminRepository.findOrderById(id);
    if (!order) throw new NotFoundException("Order not found");

    return {
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      currency: order.currency,
      customer: mapCustomer(order.user),
      items: order.items.map(mapOrderItem),
      invoices: order.invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: Number(invoice.total),
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
      })),
      hostingAccounts: order.hostingAccounts.map(mapHostingAccount),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async fulfillOrder(id: string, options?: { alreadyDeployed?: boolean }) {
    const order = await this.adminRepository.findOrderById(id);
    if (!order) throw new NotFoundException("Order not found");

    const openInvoice = order.invoices.find((invoice) => invoice.status === InvoiceStatus.OPEN);
    const paidInvoice = order.invoices.find((invoice) => invoice.status === InvoiceStatus.PAID);

    if (!paidInvoice && !options?.alreadyDeployed) {
      throw new BadRequestException(
        "Order is not paid. Complete payment first, or set alreadyDeployed=true if the service is already live (manual / offline).",
      );
    }

    if (!paidInvoice && options?.alreadyDeployed) {
      if (!openInvoice) {
        throw new BadRequestException("No open invoice found to mark as paid for alreadyDeployed");
      }
      await this.paymentsRepository.markInvoicePaidManually({
        userId: order.userId,
        invoiceId: openInvoice.id,
        orderId: order.id,
        amount: openInvoice.total,
        currency: openInvoice.currency,
        note: `admin_already_deployed:${id}`,
      });
    }

    await this.orderFulfillmentService.fulfillOrder(id);
    return this.getOrder(id);
  }

  async listInvoices() {
    const invoices = await this.adminRepository.listInvoices();
    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      total: Number(invoice.total),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      customer: mapCustomer(invoice.user),
      orderId: invoice.order?.id ?? null,
      orderStatus: invoice.order?.status ?? null,
      createdAt: invoice.createdAt,
    }));
  }

  async listTickets() {
    const tickets = await this.adminRepository.listTickets();
    return tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      relatedService: ticket.relatedServiceType
        ? {
            type: ticket.relatedServiceType,
            id: ticket.relatedServiceId,
            label: ticket.relatedServiceLabel,
          }
        : null,
      messageCount: ticket._count.messages,
      customer: mapCustomer(ticket.user),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));
  }

  async listPayments(filters: { status?: string; search?: string }) {
    const payments = await this.adminPaymentsRepository.listPayments({
      status: filters.status as import("@prisma/client").PaymentStatus | undefined,
      search: filters.search,
    });

    return payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      gatewayRef: payment.gatewayRef,
      failureReason: payment.failureReason,
      customer: mapCustomer(payment.user),
      invoice: {
        id: payment.invoice.id,
        invoiceNumber: payment.invoice.invoiceNumber,
        status: payment.invoice.status,
      },
      method: payment.method
        ? {
            id: payment.method.id,
            label: payment.method.label,
            brand: payment.method.brand,
            last4: payment.method.last4,
          }
        : null,
      createdAt: payment.createdAt,
    }));
  }
}
