import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "@nestjs/config";

import { TLSSocket, connect as tlsConnect } from "node:tls";



import { displayName, getAuthEmailCopy } from "../email/auth-email.i18n";

import { type AuthEmailLocale, resolveAuthEmailLocale } from "../email/auth-email.locale";



interface SmtpConfig {

  host: string;

  port: number;

  user: string;

  pass: string;

  from: string;

}



interface MailContent {

  subject: string;

  text: string;

  html: string;

}



@Injectable()

export class AuthEmailService {

  private readonly logger = new Logger(AuthEmailService.name);



  constructor(private readonly configService: ConfigService) {}



  async sendWelcomeEmail(

    to: string,

    locale?: string | null,

    firstName?: string | null,

    lastName?: string | null,

  ): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const name = displayName(firstName, lastName, to);

    const dashboardUrl = this.dashboardUrl();

    const content = this.createTemplate(resolved, {

      title: copy.welcome.title,

      subtitle: copy.welcome.subtitle(name),

      actionText: copy.welcome.actionText,

      actionUrl: dashboardUrl,

      footer: copy.welcome.footer,

    });

    await this.sendMail(to, content);

  }



  async sendGoogleWelcomeEmail(

    to: string,

    locale?: string | null,

    firstName?: string | null,

    lastName?: string | null,

  ): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const name = displayName(firstName, lastName, to);

    const content = this.createTemplate(resolved, {

      title: copy.googleWelcome.title,

      subtitle: copy.googleWelcome.subtitle(name),

      actionText: copy.googleWelcome.actionText,

      actionUrl: this.dashboardUrl(),

      footer: copy.googleWelcome.footer,

    });

    await this.sendMail(to, content);

  }



  async sendGoogleSignInEmail(

    to: string,

    locale?: string | null,

    firstName?: string | null,

    lastName?: string | null,

  ): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const name = displayName(firstName, lastName, to);

    const content = this.createTemplate(resolved, {

      title: copy.googleSignIn.title,

      subtitle: copy.googleSignIn.subtitle(name),

      actionText: copy.googleSignIn.actionText,

      actionUrl: this.dashboardUrl(),

      footer: copy.googleSignIn.footer,

    });

    await this.sendMail(to, content);

  }



  async sendGoogleAccountLinkedEmail(

    to: string,

    locale?: string | null,

    firstName?: string | null,

    lastName?: string | null,

  ): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const name = displayName(firstName, lastName, to);

    const content = this.createTemplate(resolved, {

      title: copy.googleAccountLinked.title,

      subtitle: copy.googleAccountLinked.subtitle(name, to),

      actionText: copy.googleAccountLinked.actionText,

      actionUrl: this.dashboardUrl(),

      footer: copy.googleAccountLinked.footer,

    });

    await this.sendMail(to, content);

  }



  async sendFailedPasswordAttemptsEmail(

    to: string,

    locale?: string | null,

    firstName?: string | null,

    lastName?: string | null,

  ): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const name = displayName(firstName, lastName, to);

    const content = this.createTemplate(resolved, {

      title: copy.failedPasswordAttempts.title,

      subtitle: copy.failedPasswordAttempts.subtitle(name),

      actionText: copy.failedPasswordAttempts.actionText,

      actionUrl: `${this.appUrl()}/forgot-password`,

      footer: copy.failedPasswordAttempts.footer,

    });

    await this.sendMail(to, content);

  }



  async sendVerificationEmail(to: string, token: string, locale?: string | null): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const verifyUrl = `${this.appUrl()}/verify-email?token=${encodeURIComponent(token)}`;

    const content = this.createTemplate(resolved, {

      title: copy.verify.title,

      subtitle: copy.verify.subtitle,

      actionText: copy.verify.actionText,

      actionUrl: verifyUrl,

      footer: copy.verify.footer,

    });

    await this.sendMail(to, content);

  }



  async sendPasswordResetEmail(to: string, token: string, locale?: string | null): Promise<void> {

    const resolved = resolveAuthEmailLocale(locale);

    const copy = getAuthEmailCopy(resolved);

    const resetUrl = `${this.appUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    const content = this.createTemplate(resolved, {

      title: copy.resetPassword.title,

      subtitle: copy.resetPassword.subtitle,

      actionText: copy.resetPassword.actionText,

      actionUrl: resetUrl,

      footer: copy.resetPassword.footer,

    });

    await this.sendMail(to, content);

  }



  private dashboardUrl(): string {

    return `${this.appUrl()}/dashboard`;

  }



  private appUrl(): string {

    return this.configService.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");

  }



  private async sendMail(to: string, content: MailContent): Promise<void> {

    const cfg = this.getConfig();

    if (!cfg) {

      this.logger.warn("SMTP config missing. Email not sent.");

      return;

    }



    const socket = await this.connect(cfg);

    try {

      await this.expectCode(socket, 220);

      await this.command(socket, `EHLO vexirahost.local`, [250]);

      await this.command(socket, "AUTH LOGIN", [334]);

      await this.command(socket, Buffer.from(cfg.user).toString("base64"), [334]);

      await this.command(socket, Buffer.from(cfg.pass).toString("base64"), [235]);

      await this.command(socket, `MAIL FROM:<${cfg.from}>`, [250]);

      await this.command(socket, `RCPT TO:<${to}>`, [250, 251]);

      await this.command(socket, "DATA", [354]);



      const boundary = `vexira_${Date.now().toString(16)}`;

      const date = new Date().toUTCString();

      const messageId = `<${Date.now()}.${Math.random().toString(16).slice(2)}@vexirahost.com>`;

      const body =

        `From: Vexira Host <${cfg.from}>\r\n` +

        `To: <${to}>\r\n` +

        `Subject: ${content.subject}\r\n` +

        `Date: ${date}\r\n` +

        `Message-ID: ${messageId}\r\n` +

        `MIME-Version: 1.0\r\n` +

        `X-Mailer: Vexira Host Transactional\r\n` +

        `Content-Type: multipart/alternative; boundary="${boundary}"\r\n` +

        `\r\n` +

        `--${boundary}\r\n` +

        `Content-Type: text/plain; charset=utf-8\r\n` +

        `Content-Transfer-Encoding: 8bit\r\n` +

        `\r\n` +

        `${content.text}\r\n` +

        `\r\n` +

        `--${boundary}\r\n` +

        `Content-Type: text/html; charset=utf-8\r\n` +

        `Content-Transfer-Encoding: 8bit\r\n` +

        `\r\n` +

        `${content.html}\r\n` +

        `\r\n` +

        `--${boundary}--\r\n` +

        `.\r\n`;



      const dataResult = await this.writeAndRead(socket, body);

      this.ensureCode(dataResult, [250]);

      await this.command(socket, "QUIT", [221]);

    } finally {

      socket.end();

      socket.destroy();

    }

  }



  private createTemplate(

    locale: AuthEmailLocale,

    input: {

      title: string;

      subtitle: string;

      actionText: string;

      actionUrl: string;

      footer: string;

    },

  ): MailContent {

    const appUrl = this.appUrl();

    const brand = "Vexira Host";

    const tagline = getAuthEmailCopy(locale).brandTagline;

    const title = this.escapeHtml(input.title);

    const subtitle = this.escapeHtml(input.subtitle);

    const actionText = this.escapeHtml(input.actionText);

    const actionUrl = input.actionUrl;

    const footer = this.escapeHtml(input.footer);



    const text =

      `${brand}\n\n` +

      `${input.title}\n` +

      `${input.subtitle}\n\n` +

      `${input.actionText}: ${input.actionUrl}\n\n` +

      `${input.footer}\n` +

      `Web site: ${appUrl}`;



    const html = `<!doctype html>

<html>

  <body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:28px 12px;">

      <tr>

        <td align="center">

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e6eaf2;border-radius:16px;overflow:hidden;">

            <tr>

              <td style="padding:22px 28px;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#ffffff;">

                <div style="font-size:20px;font-weight:700;letter-spacing:.2px;">${brand}</div>

                <div style="margin-top:6px;font-size:13px;opacity:.9;">${this.escapeHtml(tagline)}</div>

              </td>

            </tr>

            <tr>

              <td style="padding:28px;">

                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#0f172a;">${title}</h1>

                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">${subtitle}</p>

                <a href="${actionUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px;">${actionText}</a>

                <p style="margin:18px 0 0;font-size:13px;color:#64748b;word-break:break-all;">${this.escapeHtml(actionUrl)}</p>

                <hr style="border:none;border-top:1px solid #e6eaf2;margin:24px 0;">

                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">${footer}</p>

              </td>

            </tr>

            <tr>

              <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e6eaf2;font-size:12px;color:#94a3b8;">

                ${brand} · ${this.escapeHtml(appUrl)}

              </td>

            </tr>

          </table>

        </td>

      </tr>

    </table>

  </body>

</html>`;



    return {

      subject: `${brand} • ${input.title}`,

      text,

      html,

    };

  }



  private escapeHtml(value: string): string {

    return value

      .replaceAll("&", "&amp;")

      .replaceAll("<", "&lt;")

      .replaceAll(">", "&gt;")

      .replaceAll('"', "&quot;")

      .replaceAll("'", "&#039;");

  }



  private getConfig(): SmtpConfig | null {

    const host = this.configService.get<string>("SMTP_HOST", "").trim();

    const port = Number(this.configService.get<string>("SMTP_PORT", "465"));

    const user = this.configService.get<string>("SMTP_USER", "").trim();

    const pass = this.configService.get<string>("SMTP_PASS", "").trim();

    const from = this.configService.get<string>("SMTP_FROM", user).trim();

    if (!host || !port || !user || !pass || !from) return null;

    return { host, port, user, pass, from };

  }



  private connect(cfg: SmtpConfig): Promise<TLSSocket> {

    return new Promise((resolve, reject) => {

      const socket = tlsConnect(

        {

          host: cfg.host,

          port: cfg.port,

          servername: cfg.host,

        },

        () => resolve(socket),

      );

      socket.on("error", reject);

    });

  }



  private async command(socket: TLSSocket, cmd: string, okCodes: number[]): Promise<string> {

    const result = await this.writeAndRead(socket, `${cmd}\r\n`);

    this.ensureCode(result, okCodes);

    return result;

  }



  private async expectCode(socket: TLSSocket, code: number): Promise<string> {

    const result = await this.readResponse(socket);

    this.ensureCode(result, [code]);

    return result;

  }



  private ensureCode(result: string, okCodes: number[]): void {

    const lines = result.trim().split(/\r?\n/).filter(Boolean);

    const last = lines[lines.length - 1] ?? "";

    const code = Number(last.slice(0, 3));

    if (!okCodes.includes(code)) {

      throw new Error(`SMTP error: ${last}`);

    }

  }



  private writeAndRead(socket: TLSSocket, payload: string): Promise<string> {

    return new Promise((resolve, reject) => {

      socket.write(payload, (err) => {

        if (err) {

          reject(err);

          return;

        }

        this.readResponse(socket).then(resolve).catch(reject);

      });

    });

  }



  private readResponse(socket: TLSSocket): Promise<string> {

    return new Promise((resolve, reject) => {

      let buffer = "";

      const onData = (chunk: Buffer) => {

        buffer += chunk.toString("utf8");

        const lines = buffer.split(/\r?\n/).filter(Boolean);

        const last = lines[lines.length - 1];

        if (last && /^\d{3}\s/.test(last)) {

          cleanup();

          resolve(buffer);

        }

      };

      const onError = (err: Error) => {

        cleanup();

        reject(err);

      };

      const cleanup = () => {

        socket.off("data", onData);

        socket.off("error", onError);

      };

      socket.on("data", onData);

      socket.on("error", onError);

    });

  }

}


