import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TicketStatus } from "@prisma/client";

import { resolveAuthEmailLocale } from "@/modules/auth/email/auth-email.locale";
import {
  displayName,
  resolveEmailLocaleFromUser,
} from "@/modules/licenses/email/addon-email.i18n";
import { SmtpMailService, type MailContent } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
} from "@/shared/email/transactional-template.util";

import { getTicketEmailCopy, truncateMessage } from "../email/ticket-email.i18n";

type TicketMailUser = {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  preferredCurrency?: string | null;
};

@Injectable()
export class TicketEmailService {
  private readonly logger = new Logger(TicketEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  async sendTicketCreatedEmail(
    input: TicketMailUser & {
      ticketId: string;
      subject: string;
      status: TicketStatus;
      priority: string;
      message: string;
    },
  ): Promise<void> {
    const locale = resolveAuthEmailLocale(resolveEmailLocaleFromUser(input.preferredCurrency));
    const copy = getTicketEmailCopy(locale);
    const c = copy.created;
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const ticketUrl = `${appUrl}/dashboard/tickets/${input.ticketId}`;
    const preview = truncateMessage(input.message);

    const bodyHtml = [
      noticeBlock(c.noticeTitle, c.noticeBody, "info"),
      infoTable(
        infoRow(c.ticketIdLabel, input.ticketId.slice(0, 10).toUpperCase()) +
          infoRow(c.subjectLabel, input.subject) +
          infoRow(c.statusLabel, copy.statusLabel(input.status)) +
          infoRow(c.priorityLabel, input.priority),
      ),
      noticeBlock(c.messageLabel, preview, "info"),
      primaryButton(c.openButton, ticketUrl),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: c.title,
      subtitle: c.subtitle(name, input.subject),
      bodyHtml,
      footer: c.footer,
    });

    content.subject = `Vexira Host • ${c.title} — ${input.subject}`;
    content.text = this.buildText(c.title, c.subtitle(name, input.subject), [
      `${c.ticketIdLabel}: ${input.ticketId}`,
      `${c.subjectLabel}: ${input.subject}`,
      `${c.statusLabel}: ${copy.statusLabel(input.status)}`,
      `${c.messageLabel}: ${preview}`,
      `${c.openButton}: ${ticketUrl}`,
    ], c.footer);

    await this.safeSend(input.to, content);
  }

  async sendTicketReplyEmail(
    input: TicketMailUser & {
      ticketId: string;
      subject: string;
      status: TicketStatus;
      message: string;
    },
  ): Promise<void> {
    const locale = resolveAuthEmailLocale(resolveEmailLocaleFromUser(input.preferredCurrency));
    const copy = getTicketEmailCopy(locale);
    const c = copy.reply;
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const ticketUrl = `${appUrl}/dashboard/tickets/${input.ticketId}`;
    const preview = truncateMessage(input.message);

    const bodyHtml = [
      noticeBlock(c.noticeTitle, c.noticeBody, "info"),
      infoTable(
        infoRow(c.subjectLabel, input.subject) +
          infoRow(c.statusLabel, copy.statusLabel(input.status)),
      ),
      noticeBlock(c.messageLabel, preview, "info"),
      primaryButton(c.openButton, ticketUrl),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: c.title,
      subtitle: c.subtitle(name, input.subject),
      bodyHtml,
      footer: c.footer,
    });

    content.subject = `Vexira Host • ${c.title} — ${input.subject}`;
    content.text = this.buildText(c.title, c.subtitle(name, input.subject), [
      `${c.subjectLabel}: ${input.subject}`,
      `${c.statusLabel}: ${copy.statusLabel(input.status)}`,
      `${c.messageLabel}: ${preview}`,
      `${c.openButton}: ${ticketUrl}`,
    ], c.footer);

    await this.safeSend(input.to, content);
  }

  async sendTicketStatusChangedEmail(
    input: TicketMailUser & {
      ticketId: string;
      subject: string;
      previousStatus: TicketStatus;
      newStatus: TicketStatus;
    },
  ): Promise<void> {
    if (input.previousStatus === input.newStatus) return;

    const locale = resolveAuthEmailLocale(resolveEmailLocaleFromUser(input.preferredCurrency));
    const copy = getTicketEmailCopy(locale);
    const c = copy.statusChanged;
    const name = displayName(input.firstName, input.lastName, input.to);
    const fromLabel = copy.statusLabel(input.previousStatus);
    const toLabel = copy.statusLabel(input.newStatus);
    const appUrl = this.appUrl();
    const ticketUrl = `${appUrl}/dashboard/tickets/${input.ticketId}`;
    const tone =
      input.newStatus === "RESOLVED" || input.newStatus === "CLOSED" ? "warning" : "info";

    const bodyHtml = [
      noticeBlock(c.noticeTitle, c.noticeBody(fromLabel, toLabel), tone),
      infoTable(
        infoRow(c.subjectLabel, input.subject) +
          infoRow(c.previousLabel, fromLabel) +
          infoRow(c.newLabel, toLabel),
      ),
      primaryButton(c.openButton, ticketUrl),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: c.title,
      subtitle: c.subtitle(name, input.subject),
      bodyHtml,
      footer: c.footer,
    });

    content.subject = `Vexira Host • ${c.title} — ${toLabel}`;
    content.text = this.buildText(c.title, c.subtitle(name, input.subject), [
      `${c.subjectLabel}: ${input.subject}`,
      `${c.previousLabel}: ${fromLabel}`,
      `${c.newLabel}: ${toLabel}`,
      `${c.openButton}: ${ticketUrl}`,
    ], c.footer);

    await this.safeSend(input.to, content);
  }

  private buildText(title: string, subtitle: string, lines: string[], footer: string): string {
    return `${title}\n\n${subtitle}\n\n${lines.join("\n")}\n\n${footer}`;
  }

  private async safeSend(to: string, content: MailContent): Promise<void> {
    try {
      await this.smtpMailService.send(to, content);
    } catch (error) {
      this.logger.error(
        `Failed to send ticket email to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }
}
