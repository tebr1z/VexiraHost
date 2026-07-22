import { Injectable } from "@nestjs/common";
import type { TicketPriority, TicketRelatedServiceType, TicketStatus } from "@prisma/client";
import { PrismaService } from "@/database/database.module";

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.ticket.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  findByIdForStaff(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        attachments: { orderBy: { createdAt: "asc" } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            preferredCurrency: true,
          },
        },
      },
    });
  }

  createTicket(data: {
    userId: string;
    subject: string;
    priority: TicketPriority;
    message: string;
    relatedServiceType?: TicketRelatedServiceType;
    relatedServiceId?: string;
    relatedServiceLabel?: string;
  }) {
    return this.prisma.ticket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        priority: data.priority,
        relatedServiceType: data.relatedServiceType,
        relatedServiceId: data.relatedServiceId,
        relatedServiceLabel: data.relatedServiceLabel,
        messages: {
          create: {
            userId: data.userId,
            body: data.message,
            isStaff: false,
          },
        },
      },
      include: {
        _count: { select: { messages: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            preferredCurrency: true,
          },
        },
      },
    });
  }

  findRelatedServicesForUser(userId: string) {
    return Promise.all([
      this.prisma.hostingAccount.findMany({
        where: { userId },
        include: { plan: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.server.findMany({
        where: { userId },
        include: { plan: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.domain.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.addonService.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  }

  findRelatedServiceForUser(
    userId: string,
    type: TicketRelatedServiceType,
    id: string,
  ) {
    switch (type) {
      case "HOSTING":
        return this.prisma.hostingAccount.findFirst({
          where: { id, userId },
          include: { plan: { select: { name: true } } },
        });
      case "SERVER":
        return this.prisma.server.findFirst({
          where: { id, userId },
          include: { plan: { select: { name: true } } },
        });
      case "DOMAIN":
        return this.prisma.domain.findFirst({ where: { id, userId } });
      case "ADDON":
        return this.prisma.addonService.findFirst({ where: { id, userId } });
      default:
        return Promise.resolve(null);
    }
  }

  addReply(data: {
    ticketId: string;
    userId: string;
    message: string;
    isStaff: boolean;
    status?: TicketStatus;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.status) {
        await tx.ticket.update({
          where: { id: data.ticketId },
          data: { status: data.status },
        });
      } else {
        await tx.ticket.update({
          where: { id: data.ticketId },
          data: { updatedAt: new Date() },
        });
      }

      return tx.ticketMessage.create({
        data: {
          ticketId: data.ticketId,
          userId: data.userId,
          body: data.message,
          isStaff: data.isStaff,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  createAttachment(data: {
    ticketId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    size: number;
  }) {
    return this.prisma.ticketAttachment.create({ data });
  }

  findAttachmentById(id: string) {
    return this.prisma.ticketAttachment.findUnique({
      where: { id },
      include: {
        ticket: { select: { id: true, userId: true } },
      },
    });
  }

  updateStatus(id: string, status: TicketStatus) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status },
      include: {
        _count: { select: { messages: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            preferredCurrency: true,
          },
        },
      },
    });
  }
}
