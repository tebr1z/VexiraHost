import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TicketPriority, TicketRelatedServiceType, TicketStatus } from "@prisma/client";
import { UserRole } from "@vexira/types";
import { randomUUID } from "node:crypto";

import { STORAGE_PROVIDER, type StorageProvider } from "@/shared/storage/storage.interface";

import type { CreateTicketDto, ReplyTicketDto } from "../dto";
import { TicketsRepository } from "../repository/tickets.repository";
import { TicketEmailService } from "./ticket-email.service";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

function mapAttachment(attachment: {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt,
  };
}

function mapTicketSummary(ticket: {
  id: string;
  subject: string;
  status: string;
  priority: string;
  relatedServiceType?: string | null;
  relatedServiceId?: string | null;
  relatedServiceLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
}) {
  return {
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
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function mapMessage(message: {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}) {
  return {
    id: message.id,
    body: message.body,
    isStaff: message.isStaff,
    createdAt: message.createdAt,
    author: {
      id: message.user.id,
      email: message.user.email,
      firstName: message.user.firstName,
      lastName: message.user.lastName,
    },
  };
}

function mapTicketDetail(ticket: {
  id: string;
  subject: string;
  status: string;
  priority: string;
  relatedServiceType?: string | null;
  relatedServiceId?: string | null;
  relatedServiceLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    body: string;
    isStaff: boolean;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }[];
  attachments?: {
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }[];
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}) {
  return {
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
    requester: ticket.user
      ? {
          id: ticket.user.id,
          email: ticket.user.email,
          firstName: ticket.user.firstName,
          lastName: ticket.user.lastName,
        }
      : undefined,
    messages: ticket.messages.map(mapMessage),
    attachments: (ticket.attachments ?? []).map(mapAttachment),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly ticketEmailService: TicketEmailService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async listForUser(userId: string) {
    const tickets = await this.ticketsRepository.findByUserId(userId);
    return tickets.map(mapTicketSummary);
  }

  async getForUser(id: string, userId: string, role: UserRole) {
    const isStaff = role === UserRole.ADMIN || role === UserRole.STAFF;
    const ticket = isStaff
      ? await this.ticketsRepository.findByIdForStaff(id)
      : await this.ticketsRepository.findByIdForUser(id, userId);

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    if (!isStaff && ticket.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return mapTicketDetail(ticket);
  }

  async listRelatedServices(userId: string) {
    const [hosting, servers, domains, addons] =
      await this.ticketsRepository.findRelatedServicesForUser(userId);

    return [
      ...hosting.map((item) => ({
        type: TicketRelatedServiceType.HOSTING,
        id: item.id,
        label: `${item.plan.name} — ${item.primaryDomain}`,
        status: item.status,
      })),
      ...servers.map((item) => ({
        type: TicketRelatedServiceType.SERVER,
        id: item.id,
        label: item.displayName || item.hostname,
        status: item.status,
      })),
      ...domains.map((item) => ({
        type: TicketRelatedServiceType.DOMAIN,
        id: item.id,
        label: item.name,
        status: item.status,
      })),
      ...addons.map((item) => ({
        type: TicketRelatedServiceType.ADDON,
        id: item.id,
        label: item.name,
        status: item.status,
      })),
    ];
  }

  async create(userId: string, dto: CreateTicketDto) {
    let relatedServiceType: TicketRelatedServiceType | undefined;
    let relatedServiceId: string | undefined;
    let relatedServiceLabel: string | undefined;

    if (dto.relatedServiceType || dto.relatedServiceId) {
      if (!dto.relatedServiceType || !dto.relatedServiceId) {
        throw new BadRequestException("Both related service type and id are required");
      }

      relatedServiceLabel = await this.resolveRelatedServiceLabel(
        userId,
        dto.relatedServiceType,
        dto.relatedServiceId,
      );
      relatedServiceType = dto.relatedServiceType;
      relatedServiceId = dto.relatedServiceId;
    }

    const ticket = await this.ticketsRepository.createTicket({
      userId,
      subject: dto.subject.trim(),
      priority: dto.priority ?? TicketPriority.MEDIUM,
      message: dto.message.trim(),
      relatedServiceType,
      relatedServiceId,
      relatedServiceLabel,
    });

    if (ticket.user) {
      await this.ticketEmailService.sendTicketCreatedEmail({
        to: ticket.user.email,
        firstName: ticket.user.firstName,
        lastName: ticket.user.lastName,
        preferredCurrency: ticket.user.preferredCurrency,
        ticketId: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        message: dto.message.trim(),
      });
    }

    return mapTicketSummary(ticket);
  }

  private async resolveRelatedServiceLabel(
    userId: string,
    type: TicketRelatedServiceType,
    id: string,
  ): Promise<string> {
    const service = await this.ticketsRepository.findRelatedServiceForUser(userId, type, id);
    if (!service) {
      throw new BadRequestException("Selected service was not found on your account");
    }

    if (type === TicketRelatedServiceType.HOSTING && "plan" in service && "primaryDomain" in service) {
      return `${service.plan.name} — ${service.primaryDomain}`;
    }
    if (type === TicketRelatedServiceType.SERVER && "displayName" in service) {
      return service.displayName || service.hostname;
    }
    if (type === TicketRelatedServiceType.DOMAIN && "name" in service) {
      return service.name;
    }
    if (type === TicketRelatedServiceType.ADDON && "name" in service) {
      return service.name;
    }

    throw new BadRequestException("Selected service was not found on your account");
  }

  async reply(id: string, userId: string, role: UserRole, dto: ReplyTicketDto) {
    const isStaff = role === UserRole.ADMIN || role === UserRole.STAFF;

    if (isStaff) {
      const ticket = await this.ticketsRepository.findByIdForStaff(id);
      if (!ticket) {
        throw new NotFoundException("Ticket not found");
      }

      const status = TicketStatus.IN_PROGRESS;
      const message = await this.ticketsRepository.addReply({
        ticketId: id,
        userId,
        message: dto.message.trim(),
        isStaff: true,
        status,
      });

      if (ticket.user) {
        await this.ticketEmailService.sendTicketReplyEmail({
          to: ticket.user.email,
          firstName: ticket.user.firstName,
          lastName: ticket.user.lastName,
          preferredCurrency: ticket.user.preferredCurrency,
          ticketId: ticket.id,
          subject: ticket.subject,
          status,
          message: dto.message.trim(),
        });
      }

      return mapMessage(message);
    }

    const ticket = await this.ticketsRepository.findByIdForUser(id, userId);
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    if (ticket.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    const message = await this.ticketsRepository.addReply({
      ticketId: id,
      userId,
      message: dto.message.trim(),
      isStaff: false,
      status: TicketStatus.WAITING_CUSTOMER,
    });

    return mapMessage(message);
  }

  async updateStatus(id: string, status: TicketStatus) {
    const ticket = await this.ticketsRepository.findByIdForStaff(id);
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    const previousStatus = ticket.status;
    const updated = await this.ticketsRepository.updateStatus(id, status);

    if (updated.user && previousStatus !== status) {
      await this.ticketEmailService.sendTicketStatusChangedEmail({
        to: updated.user.email,
        firstName: updated.user.firstName,
        lastName: updated.user.lastName,
        preferredCurrency: updated.user.preferredCurrency,
        ticketId: updated.id,
        subject: updated.subject,
        previousStatus,
        newStatus: status,
      });
    }

    return mapTicketSummary({
      ...updated,
      _count: updated._count,
    });
  }

  async uploadAttachment(
    ticketId: string,
    userId: string,
    role: UserRole,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException("File exceeds 5 MB limit");
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("File type not allowed");
    }

    const isStaff = role === UserRole.ADMIN || role === UserRole.STAFF;
    const ticket = isStaff
      ? await this.ticketsRepository.findByIdForStaff(ticketId)
      : await this.ticketsRepository.findByIdForUser(ticketId, userId);

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    if (!isStaff && ticket.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    const storageKey = `tickets/${ticketId}/${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await this.storage.upload({
      key: storageKey,
      body: file.buffer,
      mimeType: file.mimetype,
    });

    const attachment = await this.ticketsRepository.createAttachment({
      ticketId,
      userId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      storageKey,
      size: file.size,
    });

    return mapAttachment(attachment);
  }

  async downloadAttachment(attachmentId: string, userId: string, role: UserRole) {
    const attachment = await this.ticketsRepository.findAttachmentById(attachmentId);
    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    const isStaff = role === UserRole.ADMIN || role === UserRole.STAFF;
    if (!isStaff && attachment.ticket.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    const buffer = await this.storage.download(attachment.storageKey);
    return {
      buffer,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }
}
