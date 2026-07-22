import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { resolveAuthEmailLocale } from "@/modules/auth/email/auth-email.locale";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  licenseKeyBlock,
  primaryButton,
} from "@/shared/email/transactional-template.util";
import { SmtpMailService } from "@/shared/email/smtp-mail.service";

import {
  displayName,
  formatEmailDate,
  getLicenseEmailCopy,
  getSslEmailCopy,
  resolveEmailLocaleFromUser,
} from "../email/addon-email.i18n";

@Injectable()
export class AddonEmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly smtpMailService: SmtpMailService,
  ) {}

  async sendLicenseDeliveryEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    locale?: string | null;
    productName: string;
    licenseKey: string;
    downloadUrl: string;
    orderId: string;
    expiresAt?: Date | null;
  }): Promise<void> {
    const locale = resolveAuthEmailLocale(input.locale ?? resolveEmailLocaleFromUser(input.preferredCurrency));
    const copy = getLicenseEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const dashboardUrl = `${appUrl}/dashboard/services`;
    const expiry = input.expiresAt
      ? formatEmailDate(input.expiresAt, locale)
      : copy.noExpiry;

    const bodyHtml = [
      licenseKeyBlock(copy.licenseKeyLabel, input.licenseKey, copy.copyHint),
      primaryButton(copy.downloadButton, input.downloadUrl),
      `<p style="margin:0 0 16px;font-size:13px;color:#64748b;word-break:break-all;">${copy.downloadLabel}: ${input.downloadUrl}</p>`,
      infoTable(
        infoRow(copy.productLabel, input.productName) +
          infoRow(copy.orderLabel, input.orderId.slice(0, 8).toUpperCase()) +
          infoRow(copy.expiresLabel, expiry),
      ),
      primaryButton(copy.dashboardButton, dashboardUrl),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: copy.title,
      subtitle: copy.subtitle(name, input.productName),
      bodyHtml,
      footer: copy.footer,
    });

    content.text =
      `${copy.title}\n\n` +
      `${copy.subtitle(name, input.productName)}\n\n` +
      `${copy.licenseKeyLabel}: ${input.licenseKey}\n\n` +
      `${copy.downloadButton}: ${input.downloadUrl}\n\n` +
      `${copy.productLabel}: ${input.productName}\n` +
      `${copy.orderLabel}: ${input.orderId}\n` +
      `${copy.expiresLabel}: ${expiry}\n\n` +
      `${copy.dashboardButton}: ${dashboardUrl}\n\n` +
      copy.footer;

    await this.smtpMailService.send(input.to, content);
  }

  async sendSslDeliveryEmail(input: {
    to: string;
    firstName?: string | null;
    lastName?: string | null;
    preferredCurrency?: string | null;
    locale?: string | null;
    productName: string;
    domain: string;
    certId: string;
    orderId: string;
  }): Promise<void> {
    const locale = resolveAuthEmailLocale(input.locale ?? resolveEmailLocaleFromUser(input.preferredCurrency));
    const copy = getSslEmailCopy(locale);
    const name = displayName(input.firstName, input.lastName, input.to);
    const appUrl = this.appUrl();
    const dashboardUrl = `${appUrl}/dashboard/services`;

    const bodyHtml = [
      infoTable(
        infoRow("Domain", input.domain) +
          infoRow("Certificate ID", input.certId) +
          infoRow(copy.detailsLabel, input.productName),
      ),
      primaryButton(copy.dashboardButton, dashboardUrl),
    ].join("");

    const content = createBrandEmail({
      brand: "Vexira Host",
      tagline: copy.brandTagline,
      appUrl,
      title: copy.title,
      subtitle: copy.subtitle(name, input.productName),
      bodyHtml,
      footer: copy.footer,
    });

    await this.smtpMailService.send(input.to, content);
  }

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }
}
