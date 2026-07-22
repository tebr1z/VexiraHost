import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { resolveAuthEmailLocale } from "@/modules/auth/email/auth-email.locale";
import {
  displayName,
  formatEmailDate,
  resolveEmailLocaleFromUser,
} from "@/modules/licenses/email/addon-email.i18n";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
  secondaryButton,
} from "@/shared/email/transactional-template.util";

import { getHostingDeletedEmailCopy } from "../email/hosting-email.i18n";

@Injectable()
export class HostingEmailService {
  private readonly logger = new Logger(HostingEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  async sendAccountDeletedEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    locale?: string | null;
    domain: string;
    planName: string;
    username: string;
    serverName?: string | null;
    deletedAt?: Date;
  }): Promise<void> {
    const locale = resolveAuthEmailLocale(
      input.locale ?? resolveEmailLocaleFromUser(input.preferredCurrency),
    );
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

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }
}
