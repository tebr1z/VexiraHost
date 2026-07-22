import { Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { randomBytes } from "node:crypto";

import { encryptSecret } from "@/utils/crypto.util";
import { isValidClientIp } from "@/utils/client-ip.util";

import { MockControlPanelProvider } from "../providers/mock-control-panel.provider";
import { HostingRepository } from "../repository/hosting.repository";

const TICKET_TTL_MS = 2 * 60 * 1000;

interface PanelOpenTicket {
  accountId: string;
  userId: string;
  clientIp?: string;
  expiresAt: number;
}

@Injectable()
export class PanelSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(PanelSessionService.name);
  private readonly tickets = new Map<string, PanelOpenTicket>();

  constructor(
    private readonly hostingRepository: HostingRepository,
    private readonly controlPanel: MockControlPanelProvider,
  ) {}

  onModuleDestroy(): void {
    this.tickets.clear();
  }

  createOpenTicket(accountId: string, userId: string, preferredClientIp?: string): string {
    const ticket = randomBytes(24).toString("hex");
    const clientIp =
      preferredClientIp && isValidClientIp(preferredClientIp) ? preferredClientIp : undefined;

    this.tickets.set(ticket, {
      accountId,
      userId,
      clientIp,
      expiresAt: Date.now() + TICKET_TTL_MS,
    });

    return ticket;
  }

  async resolveOpenTicket(ticket: string, requestIp: string): Promise<string> {
    this.pruneTickets();

    const entry = this.tickets.get(ticket);
    if (!entry || entry.expiresAt < Date.now()) {
      this.tickets.delete(ticket);
      throw new NotFoundException("Panel login link expired or invalid");
    }

    this.tickets.delete(ticket);

    const clientIp = entry.clientIp ?? requestIp;
    const result = await this.getOrCreateLoginUrl(entry.accountId, entry.userId, clientIp);
    return result.loginUrl;
  }

  async getOrCreateLoginUrl(
    accountId: string,
    userId: string,
    clientIp: string,
  ): Promise<{ loginUrl: string; expiresAt: Date }> {
    const account = await this.hostingRepository.findByIdForUser(accountId, userId);
    if (!account?.server) {
      throw new NotFoundException("Hosting account not found");
    }

    const panelLogin = (account.panelUsername ?? account.username).trim();
    if (!panelLogin) {
      throw new NotFoundException("Hosting account has no panel username");
    }

    const sourceOrigin =
      process.env.FRONTEND_URL?.trim() || process.env.APP_URL?.trim() || undefined;

    const session = await this.controlPanel.createSession(
      {
        server: account.server,
        panelUsername: panelLogin,
        panelRef: account.panelRef,
      },
      clientIp,
      sourceOrigin,
    );

    await this.hostingRepository.updateAccount(account.id, {
      panelSessionTokenEnc: encryptSecret(session.sessionId),
      panelSessionExpiresAt: session.expiresAt,
    });

    this.logger.log(
      `Panel session created for account ${accountId} (login=${panelLogin}, clientIp=${clientIp})`,
    );

    return {
      loginUrl: session.loginUrl,
      expiresAt: session.expiresAt,
    };
  }

  private pruneTickets(): void {
    const now = Date.now();
    for (const [key, value] of this.tickets) {
      if (value.expiresAt < now) this.tickets.delete(key);
    }
  }
}
