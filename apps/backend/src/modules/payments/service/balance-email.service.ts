import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { getBalanceCreditCopy } from "../email/balance-email.i18n";

import { resolveUserEmailLocale } from "@/modules/auth/email/auth-email.locale";
import { displayName } from "@/modules/licenses/email/addon-email.i18n";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
} from "@/shared/email/transactional-template.util";

@Injectable()
export class BalanceEmailService {
  private readonly logger = new Logger(BalanceEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }

  async sendBalanceCreditEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    localeHistory?: string[] | null;
    amount: number;
    currency: string;
    balanceAfter: number;
    referenceNumber: string;
    note?: string | null;
  }): Promise<void> {
    try {
      const locale = resolveUserEmailLocale({ localeHistory: input.localeHistory });
      const copy = getBalanceCreditCopy(locale);
      const name = displayName(input.firstName, input.lastName, input.to);
      const amountLabel = `${input.amount.toFixed(2)} ${input.currency}`;
      const balanceLabel = `${input.balanceAfter.toFixed(2)} ${input.currency}`;
      const appUrl = this.appUrl();
      const dashboardUrl = `${appUrl}/dashboard`;

      const bodyHtml = [
        noticeBlock(copy.noticeTitle, copy.noticeBody, "info"),
        infoTable(
          infoRow(copy.amountLabel, amountLabel) +
            infoRow(copy.balanceLabel, balanceLabel) +
            infoRow(copy.referenceLabel, input.referenceNumber) +
            (input.note ? infoRow(copy.noteLabel, input.note) : ""),
        ),
        primaryButton(copy.dashboardButton, dashboardUrl),
      ].join("");

      const content = createBrandEmail({
        brand: "Vexira Host",
        tagline: copy.brandTagline,
        appUrl,
        title: copy.title,
        subtitle: copy.subtitle(name, amountLabel),
        bodyHtml,
        footer: copy.footer,
      });

      content.subject = `Vexira Host • ${copy.title} — ${input.referenceNumber}`;
      content.text =
        `${copy.title}\n\n` +
        `${copy.subtitle(name, amountLabel)}\n\n` +
        `${copy.amountLabel}: ${amountLabel}\n` +
        `${copy.balanceLabel}: ${balanceLabel}\n` +
        `${copy.referenceLabel}: ${input.referenceNumber}\n` +
        (input.note ? `${copy.noteLabel}: ${input.note}\n` : "") +
        `\n${copy.dashboardButton}: ${dashboardUrl}\n\n` +
        copy.footer;

      await this.smtpMailService.send(input.to, content);
    } catch (error) {
      this.logger.error(
        `Failed to send balance credit email to ${input.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
