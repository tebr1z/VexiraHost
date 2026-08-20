import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SubmitInquiryDto } from "../dto/submit-inquiry.dto";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";
import { StaffAlertService } from "@/shared/staff-alerts/staff-alert.service";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly mail: SmtpMailService,
    private readonly config: ConfigService,
    private readonly staffAlerts: StaffAlertService,
  ) {}

  async submit(dto: SubmitInquiryDto, ip?: string): Promise<{ message: string }> {
    const kindLabel = dto.kind === "support" ? "Support" : "Contact";
    const subject = (dto.subject?.trim() || `${kindLabel} form`).slice(0, 160);
    const name = dto.name.trim();
    const email = dto.email.trim();
    const message = dto.message.trim();
    const inbox =
      this.config.get<string>("SMTP_FROM") ??
      this.config.get<string>("smtp.from") ??
      "admin@vexirahost.com";

    const text =
      `${kindLabel} inquiry\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `IP: ${ip ?? "-"}\n\n` +
      `${message}`;

    const html =
      `<p><strong>${escapeHtml(kindLabel)} inquiry</strong></p>` +
      `<p>Name: ${escapeHtml(name)}<br/>Email: ${escapeHtml(email)}<br/>IP: ${escapeHtml(ip ?? "-")}</p>` +
      `<p>${escapeHtml(message).replaceAll("\n", "<br/>")}</p>`;

    try {
      await this.mail.send(inbox, {
        subject: `[${kindLabel}] ${subject}`,
        text,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send ${dto.kind} inquiry email: ${String(err)}`);
    }

    this.staffAlerts.notify({
      kind: "CONTACT_FORM",
      title: `${kindLabel} forması`,
      lines: [`Ad: ${name}`, `Email: ${email}`, `Mövzu: ${subject}`, `Mesaj: ${message}`],
    });

    return { message: "Inquiry received" };
  }
}
