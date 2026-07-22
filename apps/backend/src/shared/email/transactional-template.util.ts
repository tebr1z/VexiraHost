import type { MailContent } from "./smtp-mail.service";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export interface BrandEmailLayoutInput {
  brand: string;
  tagline: string;
  appUrl: string;
  title: string;
  subtitle: string;
  bodyHtml: string;
  footer: string;
}

export function createBrandEmail(input: BrandEmailLayoutInput): MailContent {
  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle);
  const footer = escapeHtml(input.footer);
  const brand = escapeHtml(input.brand);
  const tagline = escapeHtml(input.tagline);
  const appUrl = escapeHtml(input.appUrl);

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e6eaf2;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:22px 28px;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#ffffff;">
                <div style="font-size:20px;font-weight:700;letter-spacing:.2px;">${brand}</div>
                <div style="margin-top:6px;font-size:13px;opacity:.9;">${tagline}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#0f172a;">${title}</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">${subtitle}</p>
                ${input.bodyHtml}
                <hr style="border:none;border-top:1px solid #e6eaf2;margin:24px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">${footer}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e6eaf2;font-size:12px;color:#94a3b8;">
                ${brand} · ${appUrl}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: `${input.brand} • ${input.title}`,
    text: `${input.brand}\n\n${input.title}\n${input.subtitle}\n\n${input.footer}\n${input.appUrl}`,
    html,
  };
}

export function licenseKeyBlock(label: string, licenseKey: string, hint: string): string {
  const key = escapeHtml(licenseKey);
  return `
    <div style="margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(label)}</p>
      <div style="padding:16px 18px;border:1px dashed #c4b5fd;border-radius:12px;background:linear-gradient(180deg,#faf5ff 0%,#f8fafc 100%);">
        <code style="display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:.06em;color:#5b21b6;word-break:break-all;user-select:all;-webkit-user-select:all;">${key}</code>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#64748b;">${escapeHtml(hint)}</p>
      </div>
    </div>`;
}

export function primaryButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px;margin:0 0 12px;">${escapeHtml(text)}</a>`;
}

export function secondaryButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#ffffff;color:#6d28d9;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;border:1px solid #c4b5fd;margin:0 0 12px;">${escapeHtml(text)}</a>`;
}

export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:13px;color:#0f172a;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

export function infoTable(rows: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-top:1px solid #e6eaf2;padding-top:4px;">${rows}</table>`;
}

export function noticeBlock(title: string, message: string, tone: "warning" | "danger" | "info" = "info"): string {
  const colors =
    tone === "danger"
      ? { border: "#fecaca", bg: "#fef2f2", title: "#b91c1c", text: "#7f1d1d" }
      : tone === "warning"
        ? { border: "#fde68a", bg: "#fffbeb", title: "#b45309", text: "#78350f" }
        : { border: "#c4b5fd", bg: "#f5f3ff", title: "#6d28d9", text: "#4c1d95" };

  return `
    <div style="margin:0 0 20px;padding:16px 18px;border:1px solid ${colors.border};border-radius:12px;background:${colors.bg};">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${colors.title};">${escapeHtml(title)}</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:${colors.text};">${escapeHtml(message)}</p>
    </div>`;
}
