import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { WhatsappApiRepository } from "../repository/whatsapp-api.repository";
import { hashWhatsappApiKey, looksLikeWhatsappApiKey } from "../utils/api-key.util";

export interface WhatsappApiPrincipal {
  keyId: string;
  userId: string;
}

export type WhatsappApiRequest = Request & {
  whatsappApi?: WhatsappApiPrincipal;
};

function extractApiKey(request: Request): string {
  const headerKey = request.headers["x-api-key"];
  if (typeof headerKey === "string") return headerKey.trim();
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return "";
}

@Injectable()
export class WhatsappApiKeyGuard implements CanActivate {
  constructor(private readonly repository: WhatsappApiRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WhatsappApiRequest>();
    const rawKey = extractApiKey(request);
    if (!looksLikeWhatsappApiKey(rawKey)) {
      throw new UnauthorizedException("A valid WhatsApp API key is required");
    }

    const key = await this.repository.findAuthenticatedKey(hashWhatsappApiKey(rawKey));
    const expired = key?.expiresAt && key.expiresAt <= new Date();
    if (
      !key ||
      !key.isActive ||
      key.revokedAt ||
      expired ||
      key.user.status !== "ACTIVE" ||
      !key.user.whatsappApiAccess?.isEnabled
    ) {
      throw new UnauthorizedException("WhatsApp API key is inactive or invalid");
    }

    request.whatsappApi = { keyId: key.id, userId: key.userId };
    return true;
  }
}
