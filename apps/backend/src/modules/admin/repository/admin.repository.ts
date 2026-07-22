import { Injectable } from "@nestjs/common";
import { InvoiceStatus, OrderStatus, TicketStatus, UserStatus } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

export interface AdminOrdersFilter {
  status?: OrderStatus;
  search?: string;
}

const adminUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  billingPeriod: true,
  currencyChangedAt: true,
  currencyLocked: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      orders: true,
      tickets: true,
      invoices: true,
    },
  },
} as const;

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}
  getDashboardStats() {
    return this.prisma.$transaction([
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.order.count(),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.OPEN } }),
      this.prisma.ticket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      }),
      this.prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.ticket.findMany({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          updatedAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);
  }

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: adminUserSelect,
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });
  }

  findUserEmailConflict(email: string, excludeId: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        NOT: { id: excludeId },
      },
      select: { id: true },
    });
  }

  updateUser(
    id: string,
    data: Parameters<typeof this.prisma.user.update>[0]["data"],
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: adminUserSelect,
    });
  }

  /** @deprecated use updateUser */
  findUserByIdBasic(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  updateUserRole(id: string, role: Parameters<typeof this.prisma.user.update>[0]["data"]["role"]) {
    return this.updateUser(id, { role });
  }

  updateUserStatus(
    id: string,
    status: Parameters<typeof this.prisma.user.update>[0]["data"]["status"],
  ) {
    return this.updateUser(id, { status });
  }

  listOrders(filters: AdminOrdersFilter = {}) {
    const where: {
      status?: OrderStatus;
      user?: { email: { contains: string; mode: "insensitive" } };
    } = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search?.trim()) {
      where.user = {
        email: { contains: filters.search.trim(), mode: "insensitive" },
      };
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { orderBy: { createdAt: "asc" } },
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  findOrderById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { orderBy: { createdAt: "asc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        hostingAccounts: {
          select: {
            id: true,
            primaryDomain: true,
            status: true,
            panelUrl: true,
            provisionedAt: true,
          },
        },
      },
    });
  }
  listInvoices() {
    return this.prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        order: { select: { id: true, status: true } },
      },
    });
  }

  listTickets() {
    return this.prisma.ticket.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
    });
  }
}
