import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TicketStatus } from "@prisma/client";

import { getTicketEmailCopy, truncateMessage } from "../email/ticket-email.i18n";

import {
  resolveAuthEmailLocale,
  resolveUserEmailLocale,
} from "@/modules/auth/email/auth-email.locale";
import { displayName, resolveEmailLocaleFromUser } from "@/modules/licenses/email/addon-email.i18n";
import { SmtpMailService, type MailContent } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
} from "@/shared/email/transactional-template.util";

const DEFAULT_ADMIN_NOTIFY_EMAIL = "hasimovtabriz@gmail.com";

type TicketMailUser = {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  preferredCurrency?: string | null;
  localeHistory?: string[] | null;
  locale?: string | null;
};

@Injectable()
export class TicketEmailService {
  private readonly logger = new Logger(TicketEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  private adminNotifyEmail(): string {
    return (
      process.env.TICKET_ADMIN_NOTIFY_EMAIL?.trim() ||
      this.configService.get<string>("TICKET_ADMIN_NOTIFY_EMAIL") ||
      DEFAULT_ADMIN_NOTIFY_EMAIL
    );
  }

  async sendTicketCreatedEmail(
    input: TicketMailUser & {
      ticketId: string;
      subject: string;
      status: TicketStatus;
      priority: string;
      message: string;
    },
  ): Promise<void> {
    const locale = resolveAuthEmailLocale(
      resolveEmailLocaleFromUser(input.preferredCurrency, input.localeHistory, input.locale),
    );
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
    content.text = this.buildText(
      c.title,
      c.subtitle(name, input.subject),
      [
        `${c.ticketIdLabel}: ${input.ticketId}`,
        `${c.subjectLabel}: ${input.subject}`,
        `${c.statusLabel}: ${copy.statusLabel(input.status)}`,
        `${c.messageLabel}: ${preview}`,
        `${c.openButton}: ${ticketUrl}`,
      ],
      c.footer,
    );

    await this.safeSend(input.to, content);
  }

  async sendTicketCreatedAdminNotification(input: {
    ticketId: string;
    subject: string;
    priority: string;
    message: string;
    customerEmail: string;
    customerName: string;
    clientIp?: string | null;
    lastLoginIp?: string | null;
  }): Promise<void> {
    const to = this.adminNotifyEmail();
    const appUrl = this.appUrl();
    const ticketUrl = `${appUrl}/t4abriz/panel/tickets/${input.ticketId}`;
    const preview = truncateMessage(input.message);
    const ticketIp = input.clientIp?.trim() || "—";
    const loginIp = input.lastLoginIp?.trim() || "—";

    const bodyHtml = [
      noticeBlock(
        "Yeni destek bildirimi",
        `${input.customerName} (${input.customerEmail}) yeni bir destek bileti oluşturdu.`,
        "warning",
      ),
      infoTable(
        infoRow("Bilet ID", input.ticketId.slice(0, 10).toUpperCase()) +
          infoRow("Müşteri", `${input.customerName} (${input.customerEmail})`) +
          infoRow("Konu", input.subject) +
          infoRow("Öncelik", input.priority) +
          infoRow("Bilet IP (çıkış)", ticketIp) +
          infoRow("Son giriş IP", loginIp),
      ),
      noticeBlock("Mesaj", preview, "info"),
      primaryButton("Bileti aç", ticketUrl),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: "Destek bildirimi",
      appUrl: ticketUrl,
      title: "Yeni destek bileti",
      subtitle: `${input.customerEmail} — ${input.subject}`,
      bodyHtml,
      footer: "Yeni müşteri destek bileti oluşturulduğunda bu e-posta gönderilir.",
    });

    content.subject = `Vexira Host • Yeni destek — ${input.customerEmail} (${ticketIp})`;
    content.text = [
      "Yeni destek bileti",
      `Müşteri: ${input.customerName} (${input.customerEmail})`,
      `Konu: ${input.subject}`,
      `Bilet IP: ${ticketIp}`,
      `Son giriş IP: ${loginIp}`,
      `Mesaj: ${preview}`,
      `Admin: ${ticketUrl}`,
    ].join("\n");

    await this.safeSend(to, content);
  }

  async sendTicketReplyEmail(
    input: TicketMailUser & {
      ticketId: string;
      subject: string;
      status: TicketStatus;
      message: string;
    },
  ): Promise<void> {
    const locale = resolveAuthEmailLocale(
      resolveEmailLocaleFromUser(input.preferredCurrency, input.localeHistory, input.locale),
    );
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
    content.text = this.buildText(
      c.title,
      c.subtitle(name, input.subject),
      [
        `${c.subjectLabel}: ${input.subject}`,
        `${c.statusLabel}: ${copy.statusLabel(input.status)}`,
        `${c.messageLabel}: ${preview}`,
        `${c.openButton}: ${ticketUrl}`,
      ],
      c.footer,
    );

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

    const locale = resolveAuthEmailLocale(
      resolveEmailLocaleFromUser(input.preferredCurrency, input.localeHistory, input.locale),
    );
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
    content.text = this.buildText(
      c.title,
      c.subtitle(name, input.subject),
      [
        `${c.subjectLabel}: ${input.subject}`,
        `${c.previousLabel}: ${fromLabel}`,
        `${c.newLabel}: ${toLabel}`,
        `${c.openButton}: ${ticketUrl}`,
      ],
      c.footer,
    );

    await this.safeSend(input.to, content);
  }

  async sendTicketAutoClosedEmail(
    input: TicketMailUser & {
      ticketId: string;
      subject: string;
    },
  ): Promise<void> {
    // Prefer the customer's last UI locale from localeHistory.
    const locale = resolveUserEmailLocale({
      localeHistory: input.localeHistory,
      locale: input.locale,
    });
    const copy = getTicketEmailCopy(locale);
    const c = copy.autoClosed;
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const ticketUrl = `${appUrl}/dashboard/tickets/${input.ticketId}`;

    const bodyHtml = [
      noticeBlock(c.noticeTitle, c.noticeBody, "warning"),
      infoTable(
        infoRow(c.subjectLabel, input.subject) + infoRow(c.statusLabel, copy.statusLabel("CLOSED")),
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

    content.subject = `Vexira Host • ${c.title} — ${input.subject}`;
    content.text = this.buildText(
      c.title,
      c.subtitle(name, input.subject),
      [
        `${c.subjectLabel}: ${input.subject}`,
        `${c.statusLabel}: ${copy.statusLabel("CLOSED")}`,
        `${c.openButton}: ${ticketUrl}`,
      ],
      c.footer,
    );

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
