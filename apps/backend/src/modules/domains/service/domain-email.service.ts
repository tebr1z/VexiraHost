import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DomainChangeType } from "@prisma/client";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import {
  createBrandEmail,
  infoRow,
  infoTable,
  noticeBlock,
  primaryButton,
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
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
