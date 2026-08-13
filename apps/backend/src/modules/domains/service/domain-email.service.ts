import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DomainChangeType } from "@prisma/client";

import { getDomainExpiryEmailCopy } from "../email/domain-expiry-email.i18n";

import { resolveUserEmailLocale } from "@/modules/auth/email/auth-email.locale";
import { displayName, formatEmailDate } from "@/modules/licenses/email/addon-email.i18n";
import { SmtpMailService, type MailContent } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
  secondaryButton,
} from "@/shared/email/transactional-template.util";

const DEFAULT_NOTIFY_EMAIL = "hasimovtabriz@gmail.com";

@Injectable()
export class DomainEmailService {
  private readonly logger = new Logger(DomainEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  private notifyEmail(): string {
    return (
      process.env.DOMAIN_ADMIN_NOTIFY_EMAIL?.trim() ||
      this.configService.get<string>("DOMAIN_ADMIN_NOTIFY_EMAIL") ||
      DEFAULT_NOTIFY_EMAIL
    );
  }

  private adminPanelUrl(): string {
    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return `${appUrl}/t4abriz/panel/domains/changes`;
  }

  async sendManualChangeNotification(input: {
    domainName: string;
    customerEmail: string;
    customerName: string;
    changeType: DomainChangeType;
    previousData: unknown;
    requestedData: unknown;
  }): Promise<void> {
    const to = this.notifyEmail();
    const changeLabel = input.changeType === "NAMESERVER" ? "Nameserver (NS)" : "DNS";
    const title = `Manual domain ${changeLabel} change`;
    const subtitle = `${input.customerName} (${input.customerEmail}) updated ${input.domainName}`;

    const formatJson = (value: unknown) =>
      `<pre style="margin:0;padding:12px;background:#f4f6f8;border-radius:8px;font-size:12px;line-height:1.5;overflow:auto;">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;

    const bodyHtml = [
      noticeBlock(
        "Customer submitted registrar changes",
        `This domain is managed manually (Natro/Hostinger). Apply the requested ${changeLabel} settings at the registrar, then mark the request as applied in the admin panel.`,
        "warning",
      ),
      infoTable(
        infoRow("Domain", input.domainName) +
          infoRow("Customer", `${input.customerName} (${input.customerEmail})`) +
          infoRow("Change type", changeLabel),
      ),
      `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#1a1a1a;">Previous</p>`,
      formatJson(input.previousData),
      `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#1a1a1a;">Requested</p>`,
      formatJson(input.requestedData),
      primaryButton("Open admin panel", this.adminPanelUrl()),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: "Domain administration",
      appUrl: this.adminPanelUrl(),
      title,
      subtitle,
      bodyHtml,
      footer:
        "You receive this because a customer changed DNS or nameservers on a manually assigned domain.",
    });

    content.subject = `Vexira Host • ${input.domainName} — ${changeLabel} change by ${input.customerEmail}`;

    try {
      await this.smtpMailService.send(to, content);
    } catch (err) {
      this.logger.error(`Failed to send domain change notification to ${to}`, err);
    }
  }

  async sendPreExpiryReminder(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    localeHistory?: string[] | null;
    domain: string;
    expiresAt: Date;
    daysRemaining: number;
    amount?: number | null;
    currency?: string | null;
  }): Promise<void> {
    const locale = resolveUserEmailLocale({ localeHistory: input.localeHistory });
    const copy = getDomainExpiryEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const invoicesUrl = `${appUrl}/dashboard/invoices`;
    const amount =
      input.amount != null && Number.isFinite(input.amount)
        ? `${input.amount.toFixed(2)} ${input.currency ?? "USD"}`
        : null;

    const bodyHtml = [
      noticeBlock(copy.preNoticeTitle, copy.preNoticeBody(input.daysRemaining), "warning"),
      infoTable(
        infoRow(copy.domainLabel, input.domain) +
          infoRow(copy.expiresLabel, formatEmailDate(input.expiresAt, locale)) +
          infoRow(copy.remainingLabel, String(input.daysRemaining)) +
          (amount ? infoRow(copy.amountLabel, amount) : ""),
      ),
      primaryButton(copy.renewButton, invoicesUrl),
    ].join("");

    const title = copy.preTitle(input.daysRemaining);
    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title,
      subtitle: copy.preSubtitle(name, input.domain, input.daysRemaining),
      bodyHtml,
      footer: copy.footer,
    });
    content.subject = `Vexira Host • ${title} — ${input.domain}`;
    await this.safeSend(input.to, content);
  }

  async sendPostExpiryReminder(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    localeHistory?: string[] | null;
    domain: string;
    expiredAt: Date;
    graceEndsAt: Date;
    daysSinceExpiry: number;
    daysLeft: number;
    amount?: number | null;
    fee?: number | null;
    currency?: string | null;
    invoiceNumber?: string | null;
  }): Promise<void> {
    const locale = resolveUserEmailLocale({ localeHistory: input.localeHistory });
    const copy = getDomainExpiryEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const invoicesUrl = `${appUrl}/dashboard/invoices`;
    const day = input.daysSinceExpiry;
    const isMilestone = day === 7 || day === 10 || day === 15;
    const title = isMilestone ? copy.expiredDayTitle(day as 7 | 10 | 15) : copy.expiredTitle;
    const notice = isMilestone
      ? copy.expiredDayBody(day as 7 | 10 | 15, input.daysLeft)
      : copy.expiredNoticeBody(input.daysLeft);
    const amount =
      input.amount != null && Number.isFinite(input.amount)
        ? `${input.amount.toFixed(2)} ${input.currency ?? "USD"}`
        : null;
    const fee =
      input.fee != null && input.fee > 0
        ? `${input.fee.toFixed(2)} ${input.currency ?? "USD"}`
        : null;

    const bodyHtml = [
      noticeBlock(copy.expiredNoticeTitle, notice, day >= 10 ? "danger" : "warning"),
      infoTable(
        infoRow(copy.domainLabel, input.domain) +
          infoRow(copy.expiredLabel, formatEmailDate(input.expiredAt, locale)) +
          infoRow(copy.graceLabel, formatEmailDate(input.graceEndsAt, locale)) +
          (amount ? infoRow(copy.amountLabel, amount) : "") +
          (fee ? infoRow(copy.feeLabel, fee) : "") +
          (input.invoiceNumber ? infoRow(copy.invoiceLabel, input.invoiceNumber) : ""),
      ),
      `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 8px;">
        <tr>
          <td style="padding-right:10px;">${primaryButton(copy.renewButton, invoicesUrl)}</td>
          <td>${secondaryButton(copy.dashboardButton, `${appUrl}/dashboard`)}</td>
        </tr>
      </table>`,
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title,
      subtitle: copy.expiredSubtitle(name, input.domain),
      bodyHtml,
      footer: copy.footer,
    });
    content.subject = `Vexira Host • ${title} — ${input.domain}`;
    await this.safeSend(input.to, content);
  }

  async sendDomainDeletedEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    localeHistory?: string[] | null;
    domain: string;
  }): Promise<void> {
    const locale = resolveUserEmailLocale({ localeHistory: input.localeHistory });
    const copy = getDomainExpiryEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();

    const bodyHtml = [
      noticeBlock(copy.deletedNoticeTitle, copy.deletedNoticeBody, "danger"),
      infoTable(infoRow(copy.domainLabel, input.domain)),
      primaryButton(copy.supportButton, `${appUrl}/dashboard/tickets/new`),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: copy.deletedTitle,
      subtitle: copy.deletedSubtitle(name, input.domain),
      bodyHtml,
      footer: copy.footer,
    });
    content.subject = `Vexira Host • ${copy.deletedTitle} — ${input.domain}`;
    await this.safeSend(input.to, content);
  }

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }

  private async safeSend(to: string, content: MailContent): Promise<void> {
    try {
      await this.smtpMailService.send(to, content);
    } catch (error) {
      this.logger.error(
        `Failed to send domain email to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
