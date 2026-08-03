import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { getAssignmentEmailCopy, type AssignmentEmailKind } from "../email/assignment-email.i18n";
import {
  getHostingDeletedEmailCopy,
  getHostingRenewalEmailCopy,
} from "../email/hosting-email.i18n";

import { resolveUserEmailLocale } from "@/modules/auth/email/auth-email.locale";
import { displayName, formatEmailDate } from "@/modules/licenses/email/addon-email.i18n";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
  secondaryButton,
} from "@/shared/email/transactional-template.util";

@Injectable()
export class HostingEmailService {
  private readonly logger = new Logger(HostingEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  private resolveLocale(input: { locale?: string | null; localeHistory?: string[] | null }) {
    return resolveUserEmailLocale({
      locale: input.locale,
      localeHistory: input.localeHistory,
    });
  }

  async sendAssignmentEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    locale?: string | null;
    localeHistory?: string[] | null;
    kind: AssignmentEmailKind;
    label: string;
    panel?: string | null;
    expiresAt?: Date | null;
  }): Promise<void> {
    try {
      const locale = this.resolveLocale(input);
      const copy = getAssignmentEmailCopy(locale);
      const name = displayName(input.firstName, input.lastName, input.to);
      const appUrl = this.appUrl();
      const dashboardUrl = `${appUrl}/dashboard`;
      const expires = input.expiresAt != null ? formatEmailDate(input.expiresAt, locale) : null;

      const bodyHtml = [
        noticeBlock(copy.noticeTitle, copy.noticeBody, "info"),
        infoTable(
          infoRow(copy.serviceLabel, input.label) +
            infoRow(copy.typeLabel, copy.typeValue(input.kind)) +
            (input.panel ? infoRow(copy.panelLabel, input.panel) : "") +
            (expires ? infoRow(copy.expiresLabel, expires) : ""),
        ),
        primaryButton(copy.dashboardButton, dashboardUrl),
      ].join("");

      const title = copy.title(input.kind);
      const content = createBrandEmail({
        brand: "Vexira Host",
        tagline: copy.brandTagline,
        appUrl,
        title,
        subtitle: copy.subtitle(name, input.label),
        bodyHtml,
        footer: copy.footer,
      });

      content.subject = `Vexira Host • ${title}`;
      content.text =
        `${title}\n\n` +
        `${copy.subtitle(name, input.label)}\n\n` +
        `${copy.serviceLabel}: ${input.label}\n` +
        `${copy.typeLabel}: ${copy.typeValue(input.kind)}\n` +
        (input.panel ? `${copy.panelLabel}: ${input.panel}\n` : "") +
        (expires ? `${copy.expiresLabel}: ${expires}\n` : "") +
        `\n${copy.dashboardButton}: ${dashboardUrl}\n\n` +
        copy.footer;

      await this.smtpMailService.send(input.to, content);
    } catch (error) {
      this.logger.error(
        `Failed to send assignment email to ${input.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendAccountDeletedEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    locale?: string | null;
    localeHistory?: string[] | null;
    domain: string;
    planName: string;
    username: string;
    serverName?: string | null;
    deletedAt?: Date;
  }): Promise<void> {
    const locale = this.resolveLocale(input);
    const copy = getHostingDeletedEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const dashboardUrl = `${appUrl}/dashboard`;
    const supportUrl = `${appUrl}/dashboard/tickets/new`;
    const deletedAt = formatEmailDate(input.deletedAt ?? new Date(), locale);

    const bodyHtml = [
      noticeBlock(copy.noticeTitle, copy.noticeBody, "danger"),
      infoTable(
        infoRow(copy.domainLabel, input.domain) +
          infoRow(copy.planLabel, input.planName) +
          infoRow(copy.usernameLabel, input.username) +
          infoRow(copy.serverLabel, input.serverName ?? copy.noServer) +
          infoRow(copy.deletedAtLabel, deletedAt),
      ),
      `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 8px;">
        <tr>
          <td style="padding-right:10px;">${primaryButton(copy.dashboardButton, dashboardUrl)}</td>
          <td>${secondaryButton(copy.supportButton, supportUrl)}</td>
        </tr>
      </table>`,
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: copy.title,
      subtitle: copy.subtitle(name, input.domain),
      bodyHtml,
      footer: copy.footer,
    });

    content.subject = `Vexira Host • ${copy.title} — ${input.domain}`;
    content.text =
      `${copy.title}\n\n` +
      `${copy.subtitle(name, input.domain)}\n\n` +
      `${copy.noticeTitle}\n${copy.noticeBody}\n\n` +
      `${copy.domainLabel}: ${input.domain}\n` +
      `${copy.planLabel}: ${input.planName}\n` +
      `${copy.usernameLabel}: ${input.username}\n` +
      `${copy.serverLabel}: ${input.serverName ?? copy.noServer}\n` +
      `${copy.deletedAtLabel}: ${deletedAt}\n\n` +
      `${copy.dashboardButton}: ${dashboardUrl}\n` +
      `${copy.supportButton}: ${supportUrl}\n\n` +
      copy.footer;

    try {
      await this.smtpMailService.send(input.to, content);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting deleted email to ${input.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendRenewalInvoiceEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    locale?: string | null;
    localeHistory?: string[] | null;
    domain: string;
    planName: string;
    panel: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
    dueDate: Date;
    graceDays: number;
  }): Promise<void> {
    const locale = this.resolveLocale(input);
    const copy = getHostingRenewalEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const invoicesUrl = `${appUrl}/dashboard/invoices`;
    const amountLabel = `${input.amount.toFixed(2)} ${input.currency}`;
    const due = formatEmailDate(input.dueDate, locale);

    const bodyHtml = [
      noticeBlock(copy.noticeTitle, copy.noticeBody(input.graceDays), "warning"),
      infoTable(
        infoRow(copy.domainLabel, input.domain) +
          infoRow(copy.panelLabel, input.panel) +
          infoRow(copy.amountLabel, amountLabel) +
          infoRow(copy.invoiceLabel, input.invoiceNumber) +
          infoRow(copy.dueLabel, due),
      ),
      `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 8px;">
        <tr>
          <td style="padding-right:10px;">${primaryButton(copy.payButton, invoicesUrl)}</td>
          <td>${secondaryButton(copy.invoicesButton, invoicesUrl)}</td>
        </tr>
      </table>`,
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: copy.title,
      subtitle: copy.subtitle(name, input.domain),
      bodyHtml,
      footer: copy.footer,
    });

    content.subject = `Vexira Host • ${copy.title} — ${input.invoiceNumber}`;
    content.text =
      `${copy.title}\n\n` +
      `${copy.subtitle(name, input.domain)}\n\n` +
      `${copy.noticeTitle}\n${copy.noticeBody(input.graceDays)}\n\n` +
      `${copy.domainLabel}: ${input.domain}\n` +
      `${copy.panelLabel}: ${input.panel}\n` +
      `${copy.amountLabel}: ${amountLabel}\n` +
      `${copy.invoiceLabel}: ${input.invoiceNumber}\n` +
      `${copy.dueLabel}: ${due}\n\n` +
      `${copy.payButton}: ${invoicesUrl}\n\n` +
      copy.footer;

    try {
      await this.smtpMailService.send(input.to, content);
    } catch (error) {
      this.logger.error(
        `Failed to send renewal invoice email to ${input.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }
}
