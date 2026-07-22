import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TLSSocket, connect as tlsConnect } from "node:tls";

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

@Injectable()
export class SmtpMailService {
  private readonly logger = new Logger(SmtpMailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(to: string, content: MailContent): Promise<void> {
    const cfg = this.getConfig();
    if (!cfg) {
      this.logger.warn("SMTP config missing. Email not sent.");
      return;
    }

    const socket = await this.connect(cfg);
    try {
      await this.expectCode(socket, 220);
      await this.command(socket, "EHLO vexirahost.local", [250]);
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
        { host: cfg.host, port: cfg.port, servername: cfg.host },
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
