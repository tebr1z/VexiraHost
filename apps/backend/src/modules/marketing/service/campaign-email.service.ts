import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

@Injectable()
export class CampaignEmailService {
  private readonly logger = new Logger(CampaignEmailService.name);

  constructor(
    private readonly smtp: SmtpMailService,
    private readonly configService: ConfigService,
  ) {}

  async sendCampaignEmail(input: {
    to: string;
    firstName?: string | null;
    subject: string;
    previewText?: string | null;
    bodyHtml: string;
    bodyText?: string | null;
    unsubscribeToken: string;
  }): Promise<void> {
    const appUrl = this.appUrl();
    const apiUrl = this.apiPublicUrl();
    const unsubscribePage = `${appUrl}/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
    const oneClickUrl = `${apiUrl}/marketing/unsubscribe/${encodeURIComponent(input.unsubscribeToken)}`;
    const brand = this.configService.get<string>("APP_NAME", "Vexira Host");
    const greeting = input.firstName?.trim() ? `Salam, ${input.firstName.trim()}` : "Salam";

    const plainBody =
      input.bodyText?.trim() || stripHtml(input.bodyHtml) || "Yeni kampaniyamıza baxın.";

    const text =
      `${brand}\n\n` +
      `${greeting}\n\n` +
      `${plainBody}\n\n` +
      `Abunəlikdən çıxmaq üçün: ${unsubscribePage}\n` +
      `${appUrl}`;

    const preview = input.previewText?.trim()
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.previewText.trim())}</div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="az">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;">
  ${preview}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:20px 24px;background:#0f172a;color:#fff;font-size:18px;font-weight:700;">${escapeHtml(brand)}</td></tr>
        <tr><td style="padding:28px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">${escapeHtml(greeting)},</p>
          <div style="font-size:15px;line-height:1.6;">${input.bodyHtml}</div>
        </td></tr>
        <tr><td style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#64748b;">
          Bu email kampaniya abunəliyinizə görə göndərilib.<br/>
          <a href="${escapeHtml(unsubscribePage)}" style="color:#0ea5e9;text-decoration:underline;">Abunəlikdən çıx</a>
          · <a href="${escapeHtml(appUrl)}" style="color:#64748b;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.smtp.send(
        input.to,
        { subject: input.subject, text, html },
        {
          fromName: brand,
          mailerTag: "Vexira Host Campaigns",
          headers: {
            "List-Id": `<campaigns.vexirahost.com>`,
            Precedence: "bulk",
            "List-Unsubscribe": `<${oneClickUrl}>, <${unsubscribePage}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
      );
    } catch (err) {
      this.logger.error(`Campaign email failed for ${input.to}: ${String(err)}`);
      throw err;
    }
  }

  private appUrl(): string {
    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  }

  private apiPublicUrl(): string {
    return this.configService
      .get<string>("API_PUBLIC_URL", "http://localhost:4000/api/v1")
      .replace(/\/$/, "");
  }
}
