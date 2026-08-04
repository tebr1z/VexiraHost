import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  CreateWhatsappApiKeyDto,
  SendWhatsappApiMessageDto,
  UpdateWhatsappApiAccessDto,
  UpdateWhatsappApiKeyStatusDto,
} from "../dto/whatsapp.dto";
import { WhatsappApiRepository, currentUtcMonth } from "../repository/whatsapp-api.repository";
import { createWhatsappApiKey } from "../utils/api-key.util";
import { normalizeWhatsappPhone, toWhatsappJid } from "../utils/phone.util";

import { WhatsappService } from "./whatsapp.service";

const MAX_ACTIVE_KEYS = 2;

@Injectable()
export class WhatsappApiService {
  constructor(
    private readonly repository: WhatsappApiRepository,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  async getDashboard(userId: string) {
    const [access, usage, keys] = await Promise.all([
      this.repository.getAccess(userId),
      this.repository.getUsage(userId),
      this.repository.listKeys(userId),
    ]);
    const limit = access?.monthlyLimit ?? 0;
    const used = usage?.sentCount ?? 0;
    const apiBaseUrl = this.config
      .get<string>("API_PUBLIC_URL", "http://localhost:4000/api/v1")
      .replace(/\/$/, "");
    return {
      access: {
        isEnabled: access?.isEnabled ?? false,
        monthlyLimit: limit,
        used,
        remaining: Math.max(0, limit - used),
        failed: usage?.failedCount ?? 0,
        periodStart: currentUtcMonth(),
      },
      gatewayConnected: this.whatsapp.isGatewayConnected(),
      endpoint: `${apiBaseUrl}/whatsapp/messages`,
      keys,
      maxActiveKeys: MAX_ACTIVE_KEYS,
    };
  }

  async createKey(userId: string, dto: CreateWhatsappApiKeyDto) {
    const access = await this.repository.getAccess(userId);
    if (!access?.isEnabled || access.monthlyLimit <= 0) {
      throw new ForbiddenException("WhatsApp API access has not been enabled by an administrator");
    }
    const generated = createWhatsappApiKey();
    const key = await this.repository.createKeyWithLimit(
      {
        userId,
        name: dto.name.trim(),
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        lastFour: generated.lastFour,
      },
      MAX_ACTIVE_KEYS,
    );
    if (!key) {
      throw new BadRequestException(`A maximum of ${MAX_ACTIVE_KEYS} active API keys is allowed`);
    }
    return {
      id: key.id,
      name: key.name,
      key: generated.rawKey,
      keyPrefix: key.keyPrefix,
      lastFour: key.lastFour,
      createdAt: key.createdAt,
      warning: "Store this key securely. It will not be shown again.",
    };
  }

  async revokeKey(userId: string, keyId: string) {
    const result = await this.repository.revokeKey(userId, keyId);
    if (result.count === 0) throw new NotFoundException("Active API key not found");
    return { revoked: true };
  }

  async updateKeyStatus(userId: string, keyId: string, dto: UpdateWhatsappApiKeyStatusDto) {
    const result = await this.repository.setKeyActive(userId, keyId, dto.isActive, MAX_ACTIVE_KEYS);
    if (result === "NOT_FOUND") throw new NotFoundException("API key not found");
    if (result === "LIMIT_REACHED") {
      throw new BadRequestException(`A maximum of ${MAX_ACTIVE_KEYS} active API keys is allowed`);
    }
    return { isActive: dto.isActive };
  }

  async getAdminAccess(userId: string) {
    const user = await this.repository.getAccess(userId);
    const usage = await this.repository.getUsage(userId);
    return {
      isEnabled: user?.isEnabled ?? false,
      monthlyLimit: user?.monthlyLimit ?? 0,
      used: usage?.sentCount ?? 0,
      failed: usage?.failedCount ?? 0,
      remaining: Math.max(0, (user?.monthlyLimit ?? 0) - (usage?.sentCount ?? 0)),
      periodStart: currentUtcMonth(),
    };
  }

  async updateAdminAccess(userId: string, dto: UpdateWhatsappApiAccessDto) {
    if (!(await this.repository.userExists(userId))) {
      throw new NotFoundException("User not found");
    }
    const access = await this.repository.upsertAccess(userId, {
      isEnabled: dto.isEnabled,
      monthlyLimit: dto.monthlyLimit,
    });
    return this.getAdminAccess(access.userId);
  }

  async sendMessage(principal: { userId: string; keyId: string }, dto: SendWhatsappApiMessageDto) {
    if (!this.whatsapp.isGatewayConnected()) {
      throw new ServiceUnavailableException("WhatsApp gateway is not connected");
    }

    let phone: string;
    try {
      phone = normalizeWhatsappPhone(dto.phone);
      toWhatsappJid(phone);
    } catch {
      throw new BadRequestException("Invalid destination phone number");
    }

    const reservation = await this.repository.reserveMonthlyMessage(principal.userId);
    if (!reservation.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Monthly WhatsApp message limit reached",
          limit: reservation.limit,
          used: reservation.used,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const log = await this.whatsapp.sendSystemText({
        phone,
        userId: principal.userId,
        apiKeyId: principal.keyId,
        message: dto.message.trim(),
      });
      await this.repository.touchKey(principal.keyId);
      return {
        id: log.id,
        status: log.status,
        to: phone,
        usage: {
          limit: reservation.limit,
          used: reservation.used,
          remaining: Math.max(0, reservation.limit - reservation.used),
        },
      };
    } catch (error) {
      await this.repository.releaseFailedMessage(principal.userId);
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : "WhatsApp message could not be sent",
      );
    }
  }
}
