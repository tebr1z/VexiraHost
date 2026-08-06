import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SendWhatsappMessageDto } from "../dto/whatsapp.dto";
import { WhatsappRepository } from "../repository/whatsapp.repository";
import { normalizeWhatsappPhone, toWhatsappJid } from "../utils/phone.util";

import { WhatsappSessionService } from "./whatsapp-session.service";

import { SmtpMailService } from "@/shared/email/smtp-mail.service";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private lastUnavailableAlertAt = 0;

  constructor(
    private readonly repository: WhatsappRepository,
    private readonly session: WhatsappSessionService,
    private readonly smtp: SmtpMailService,
    private readonly config: ConfigService,
  ) {}

  async getStatus() {
    const row = await this.repository.ensurePrimaryGatewayAccount();
    const livePhone = this.session.getConnectedPhone("primary");
    const qr = this.session.getQrPayload("primary");

    return {
      status: this.session.isConnected("primary") ? "CONNECTED" : row.status,
      phoneNumber: livePhone ?? row.phoneNumber,
      displayName: row.displayName,
      lastConnectedAt: row.lastConnectedAt,
      lastQrAt: row.lastQrAt,
      lastError: row.lastError,
      hasQr: Boolean(qr.qrDataUrl || qr.qr),
    };
  }

  async getQr() {
    const payload = this.session.getQrPayload("primary");
    const status = await this.getStatus();
    return {
      status: status.status,
      qr: payload.qr,
      qrDataUrl: payload.qrDataUrl,
    };
  }

  isGatewayConnected(): boolean {
    return this.session.hasConnectedAccount();
  }

  async connect() {
    await this.session.connect("primary");
    return this.getStatus();
  }

  async disconnect() {
    await this.session.disconnect("primary");
    return this.getStatus();
  }

  async listUsers(q?: string) {
    const users = await this.repository.listUsersForMessaging(q);
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    }));
  }

  async listMessages() {
    const rows = await this.repository.listRecentMessages(50);
    return rows.map((row) => ({
      id: row.id,
      toPhone: row.toPhone,
      userId: row.userId,
      body: row.body,
      status: row.status,
      error: row.error,
      gatewayAccountId: row.gatewayAccountId,
      createdAt: row.createdAt,
    }));
  }

  async sendSystemText(input: {
    phone: string;
    userId?: string | null;
    apiKeyId?: string | null;
    message: string;
  }) {
    const toPhone = normalizeWhatsappPhone(input.phone);
    const jid = toWhatsappJid(toPhone);
    return this.sendThroughPool({
      toPhone,
      jid,
      body: input.message,
      userId: input.userId,
      apiKeyId: input.apiKeyId,
    });
  }

  async send(dto: SendWhatsappMessageDto) {
    if (!this.session.isConnected()) {
      throw new ServiceUnavailableException("WhatsApp is not connected. Scan the QR code first.");
    }

    let userId: string | null = null;
    let phoneInput = dto.phone?.trim() ?? "";

    if (dto.userId?.trim()) {
      const user = await this.repository.findUserById(dto.userId.trim());
      if (!user) throw new BadRequestException("User not found");
      userId = user.id;
      if (!phoneInput && user.phone) phoneInput = user.phone;
      if (!phoneInput) {
        throw new BadRequestException(
          "Selected user has no phone on file. Enter a phone number manually.",
        );
      }
    }

    if (!phoneInput) {
      throw new BadRequestException("Provide a phone number or select a user with a phone");
    }

    let jid: string;
    let toPhone: string;
    try {
      toPhone = normalizeWhatsappPhone(phoneInput);
      jid = toWhatsappJid(toPhone);
    } catch {
      throw new BadRequestException("Invalid phone number");
    }

    const body = dto.message.trim();
    if (!body) throw new BadRequestException("Message cannot be empty");

    try {
      const log = await this.sendThroughPool({ toPhone, jid, body, userId });
      return {
        id: log.id,
        toPhone,
        userId,
        body,
        status: log.status,
        createdAt: log.createdAt,
      };
    } catch (err) {
      this.logger.warn(
        `WhatsApp gateway send failed after pool failover: ${this.safeErrorSummary(err)}`,
      );
      throw new ServiceUnavailableException("WhatsApp gateway is temporarily unavailable");
    }
  }

  async listGatewayAccounts() {
    const accounts = await this.repository.listGatewayAccounts();
    return accounts.map((account) => this.serializeAccount(account));
  }

  async createGatewayAccount(label: string) {
    return this.serializeAccount(await this.repository.createGatewayAccount(label.trim()));
  }

  async updateGatewayAccount(id: string, data: { label?: string; isEnabled?: boolean }) {
    try {
      return this.serializeAccount(await this.repository.updateGatewayAccount(id, data));
    } catch {
      throw new NotFoundException("WhatsApp gateway account not found");
    }
  }

  async getGatewayAccountQr(id: string) {
    await this.requireGatewayAccount(id);
    const payload = this.session.getQrPayload(id);
    const account = await this.repository.getGatewayAccount(id);
    return { status: this.session.isConnected(id) ? "CONNECTED" : account!.status, ...payload };
  }

  async connectGatewayAccount(id: string) {
    const account = await this.requireGatewayAccount(id);
    if (!account.isEnabled)
      throw new BadRequestException("Enable the WhatsApp gateway account before connecting it");
    await this.session.connect(id);
    return this.serializeAccount((await this.repository.getGatewayAccount(id))!);
  }

  async disconnectGatewayAccount(id: string) {
    await this.requireGatewayAccount(id);
    await this.session.disconnect(id);
    return this.serializeAccount((await this.repository.getGatewayAccount(id))!);
  }

  private async sendThroughPool(input: {
    toPhone: string;
    jid: string;
    body: string;
    userId?: string | null;
    apiKeyId?: string | null;
  }) {
    let attemptedId: string | undefined;
    let attemptCount = 0;
    let lastError: unknown = new Error("WHATSAPP_NOT_CONNECTED");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const account = (await this.repository.listEligibleGatewayAccounts(attemptedId)).find(
        (candidate) => this.session.isConnected(candidate.id),
      );
      if (!account) break;
      attemptedId = account.id;
      attemptCount += 1;
      try {
        await this.session.sendText(account.id, input.jid, input.body);
        await this.repository.recordGatewaySuccess(account.id);
        return this.repository.createMessageLog({
          toPhone: input.toPhone,
          userId: input.userId ?? null,
          apiKeyId: input.apiKeyId ?? null,
          gatewayAccountId: account.id,
          body: input.body,
          status: "SENT",
        });
      } catch (error) {
        lastError = error;
        await this.repository.recordGatewayFailure(account.id, this.safeErrorSummary(error));
      }
    }
    await this.repository.createMessageLog({
      toPhone: input.toPhone,
      userId: input.userId ?? null,
      apiKeyId: input.apiKeyId ?? null,
      gatewayAccountId: attemptedId ?? null,
      body: input.body,
      status: "FAILED",
      error: this.safeErrorSummary(lastError),
    });
    await this.sendUnavailableAlert(attemptCount, lastError);
    throw new Error("WHATSAPP_GATEWAY_UNAVAILABLE");
  }

  private async sendUnavailableAlert(attemptCount: number, error: unknown): Promise<void> {
    const now = Date.now();
    if (now - this.lastUnavailableAlertAt < 15 * 60_000) return;
    this.lastUnavailableAlertAt = now;
    const summary = this.safeErrorSummary(error);
    const recipient = this.config.get<string>(
      "WHATSAPP_UNAVAILABLE_ALERT_TO",
      "hasimovtabriz@gmail.com",
    );
    const timestamp = new Date(now).toISOString();
    const text = `WhatsApp server is unavailable.\nTimestamp: ${timestamp}\nAttempts: ${attemptCount}\nError class: ${error instanceof Error ? error.name : "UnknownError"}\nError message length: ${summary.length}`;
    try {
      await this.smtp.send(recipient, {
        subject: "WhatsApp server unavailable",
        text,
        html: text.replace(/\n/g, "<br>"),
      });
    } catch (mailError) {
      this.logger.warn(
        `WhatsApp unavailable alert could not be sent: ${this.safeErrorSummary(mailError)}`,
      );
    }
  }

  private async requireGatewayAccount(id: string) {
    const account = await this.repository.getGatewayAccount(id);
    if (!account) throw new NotFoundException("WhatsApp gateway account not found");
    return account;
  }

  private serializeAccount(account: {
    id: string;
    label: string;
    status: string;
    phoneNumber: string | null;
    displayName: string | null;
    isEnabled: boolean;
    sentCount: number;
    failedCount: number;
    lastSentAt: Date | null;
    lastQrAt: Date | null;
    lastConnectedAt: Date | null;
    lastError: string | null;
  }) {
    const qr = this.session.getQrPayload(account.id);
    return {
      ...account,
      status: this.session.isConnected(account.id) ? "CONNECTED" : account.status,
      hasQr: Boolean(qr.qr || qr.qrDataUrl),
    };
  }

  private safeErrorSummary(error: unknown): string {
    return (error instanceof Error ? error.message : String(error))
      .replace(/[\r\n]/g, " ")
      .slice(0, 300);
  }
}
