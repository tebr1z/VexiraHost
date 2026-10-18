import { Injectable, Logger } from "@nestjs/common";
import { NotificationOutboxChannel, NotificationOutboxStatus, type Prisma } from "@prisma/client";

import { NotificationTemplate } from "../notification-outbox.constants";

import { PrismaService } from "@/database/database.module";
import { HostingEmailService } from "@/modules/hosting/service/hosting-email.service";
import { WhatsappService } from "@/modules/whatsapp/service/whatsapp.service";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

type Payload = Record<string, unknown>;

function asPayload(value: Prisma.JsonValue): Payload {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Notification payload must be an object");
  }
  return value as Payload;
}

function requiredString(payload: Payload, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Notification payload is missing ${key}`);
  }
  return value;
}

@Injectable()
export class NotificationOutboxProcessorService {
  private readonly logger = new Logger(NotificationOutboxProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smtp: SmtpMailService,
    private readonly hostingEmail: HostingEmailService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async deliver(id: string): Promise<void> {
    const claimed = await this.prisma.notificationOutbox.updateMany({
      where: {
        id,
        status: { in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.FAILED] },
      },
      data: {
        status: NotificationOutboxStatus.PROCESSING,
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    if (claimed.count === 0) return;

    const item = await this.prisma.notificationOutbox.findUniqueOrThrow({ where: { id } });
    try {
      await this.dispatch(item.channel, item.template, item.recipient, asPayload(item.payload));
      await this.prisma.notificationOutbox.update({
        where: { id },
        data: { status: NotificationOutboxStatus.SENT, sentAt: new Date(), lastError: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const delayMinutes = Math.min(60, 2 ** Math.min(item.attempts, 5));
      await this.prisma.notificationOutbox.update({
        where: { id },
        data: {
          status: NotificationOutboxStatus.FAILED,
          lastError: message.slice(0, 4_000),
          availableAt: new Date(Date.now() + delayMinutes * 60_000),
        },
      });
      this.logger.warn(`Outbox delivery ${id} failed: ${message}`);
      throw error;
    }
  }

  private async dispatch(
    channel: NotificationOutboxChannel,
    template: string,
    recipient: string,
    payload: Payload,
  ): Promise<void> {
    if (channel === NotificationOutboxChannel.WHATSAPP) {
      if (template !== NotificationTemplate.TEXT) {
        throw new Error(`Unsupported WhatsApp template: ${template}`);
      }
      await this.whatsapp.sendSystemText({
        phone: recipient,
        userId: typeof payload.userId === "string" ? payload.userId : undefined,
        message: requiredString(payload, "message"),
      });
      return;
    }

    if (!this.smtp.isConfigured()) throw new Error("SMTP config missing");
    if (template === NotificationTemplate.RAW_EMAIL) {
      await this.smtp.send(recipient, {
        subject: requiredString(payload, "subject"),
        text: requiredString(payload, "text"),
        html: requiredString(payload, "html"),
      });
      return;
    }
    if (template === NotificationTemplate.HOSTING_RENEWAL) {
      await this.hostingEmail.sendRenewalInvoiceEmail({
        to: recipient,
        firstName: typeof payload.firstName === "string" ? payload.firstName : null,
        lastName: typeof payload.lastName === "string" ? payload.lastName : null,
        preferredCurrency:
          typeof payload.preferredCurrency === "string" ? payload.preferredCurrency : null,
        localeHistory: Array.isArray(payload.localeHistory)
          ? payload.localeHistory.filter((value): value is string => typeof value === "string")
          : [],
        domain: requiredString(payload, "domain"),
        planName: requiredString(payload, "planName"),
        panel: requiredString(payload, "panel"),
        amount: Number(payload.amount),
        currency: requiredString(payload, "currency"),
        invoiceNumber: requiredString(payload, "invoiceNumber"),
        invoiceId: requiredString(payload, "invoiceId"),
        dueDate: new Date(requiredString(payload, "dueDate")),
        graceDays: Number(payload.graceDays),
        strict: true,
      });
      return;
    }
    throw new Error(`Unsupported email template: ${template}`);
  }
}
