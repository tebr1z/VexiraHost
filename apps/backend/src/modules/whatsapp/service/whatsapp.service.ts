import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

import type { SendWhatsappMessageDto } from "../dto/whatsapp.dto";
import { WhatsappRepository } from "../repository/whatsapp.repository";
import { normalizeWhatsappPhone, toWhatsappJid } from "../utils/phone.util";

import { WhatsappSessionService } from "./whatsapp-session.service";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly repository: WhatsappRepository,
    private readonly session: WhatsappSessionService,
  ) {}

  async getStatus() {
    const row = (await this.repository.getSession()) ?? (await this.repository.ensureSession());
    const livePhone = this.session.getConnectedPhone();
    const qr = this.session.getQrPayload();

    return {
      status: this.session.isConnected() ? "CONNECTED" : row.status,
      phoneNumber: livePhone ?? row.phoneNumber,
      displayName: row.displayName,
      lastConnectedAt: row.lastConnectedAt,
      lastQrAt: row.lastQrAt,
      lastError: row.lastError,
      hasQr: Boolean(qr.qrDataUrl || qr.qr),
    };
  }

  async getQr() {
    const payload = this.session.getQrPayload();
    const status = await this.getStatus();
    return {
      status: status.status,
      qr: payload.qr,
      qrDataUrl: payload.qrDataUrl,
    };
  }

  isGatewayConnected(): boolean {
    return this.session.isConnected();
  }

  async connect() {
    await this.session.connect();
    return this.getStatus();
  }

  async disconnect() {
    await this.session.disconnect();
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
      createdAt: row.createdAt,
    }));
  }

  async sendSystemText(input: {
    phone: string;
    userId?: string | null;
    apiKeyId?: string | null;
    message: string;
  }) {
    if (!this.session.isConnected()) throw new Error("WHATSAPP_NOT_CONNECTED");
    const toPhone = normalizeWhatsappPhone(input.phone);
    const jid = toWhatsappJid(toPhone);
    try {
      await this.session.sendText(jid, input.message);
      return await this.repository.createMessageLog({
        toPhone,
        userId: input.userId ?? null,
        apiKeyId: input.apiKeyId ?? null,
        body: input.message,
        status: "SENT",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.createMessageLog({
        toPhone,
        userId: input.userId ?? null,
        apiKeyId: input.apiKeyId ?? null,
        body: input.message,
        status: "FAILED",
        error: message,
      });
      throw error;
    }
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
      await this.session.sendText(jid, body);
      const log = await this.repository.createMessageLog({
        toPhone,
        userId,
        body,
        status: "SENT",
      });
      return {
        id: log.id,
        toPhone,
        userId,
        body,
        status: log.status,
        createdAt: log.createdAt,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send WhatsApp message to ${toPhone}: ${message}`);
      await this.repository.createMessageLog({
        toPhone,
        userId,
        body,
        status: "FAILED",
        error: message,
      });
      throw new ServiceUnavailableException(`Failed to send WhatsApp message: ${message}`);
    }
  }
}
