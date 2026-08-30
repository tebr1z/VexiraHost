import { randomBytes } from "node:crypto";

import { Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { HostingManagementMode } from "@prisma/client";

import { MockControlPanelProvider } from "../providers/mock-control-panel.provider";
import { HostingRepository } from "../repository/hosting.repository";
import { buildPanelAutoLoginHtml } from "../utils/panel-auto-login.util";

import { isValidClientIp } from "@/utils/client-ip.util";
import { encryptSecret, decryptSecret } from "@/utils/crypto.util";

const TICKET_TTL_MS = 2 * 60 * 1000;

interface PanelOpenTicket {
  accountId: string;
  userId: string;
  clientIp?: string;
  redirectPath?: string;
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

  createOpenTicket(
    accountId: string,
    userId: string,
    preferredClientIp?: string,
    redirectPath?: string,
  ): string {
    const ticket = randomBytes(24).toString("hex");
    const clientIp =
      preferredClientIp && isValidClientIp(preferredClientIp) ? preferredClientIp : undefined;

    this.tickets.set(ticket, {
      accountId,
      userId,
      clientIp,
      redirectPath,
      expiresAt: Date.now() + TICKET_TTL_MS,
    });

    return ticket;
  }

  async resolveOpenTicket(ticket: string, requestIp: string): Promise<string | { html: string }> {
    this.pruneTickets();

    const entry = this.tickets.get(ticket);
    if (!entry || entry.expiresAt < Date.now()) {
      this.tickets.delete(ticket);
      throw new NotFoundException("Panel login link expired or invalid");
    }

    this.tickets.delete(ticket);

    const clientIp = entry.clientIp ?? requestIp;
    return this.getOrCreateLoginResult(entry.accountId, entry.userId, clientIp, entry.redirectPath);
  }

  async getOrCreateLoginResult(
    accountId: string,
    userId: string,
    clientIp: string,
    redirectPath?: string,
  ): Promise<string | { html: string }> {
    const account = await this.hostingRepository.findByIdForUser(accountId, userId);
    if (!account) {
      throw new NotFoundException("Hosting account not found");
    }

    if (account.managementMode === HostingManagementMode.MANUAL && !account.server) {
      return this.buildManualLoginResult(account);
    }

    if (!account.server) {
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
        redirectPath,
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

    return session.loginUrl;
  }

  async getOrCreateLoginUrl(
    accountId: string,
    userId: string,
    clientIp: string,
  ): Promise<{ loginUrl: string; expiresAt: Date }> {
    const result = await this.getOrCreateLoginResult(accountId, userId, clientIp);
    if (typeof result !== "string") {
      throw new NotFoundException("Manual panel login requires ticket flow");
    }

    return {
      loginUrl: result,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  private buildManualLoginResult(account: {
    panel: string;
    panelUrl: string | null;
    panelIp: string | null;
    panelUsername: string | null;
    username: string;
    panelPasswordEnc: string | null;
  }): { html: string } {
    const panelUrl = account.panelUrl?.trim();
    if (!panelUrl) {
      throw new NotFoundException("Panel URL is not configured for this service");
    }

    const login = (account.panelUsername ?? account.username).trim();
    if (!login) {
      throw new NotFoundException("Hosting account has no panel username");
    }

    if (!account.panelPasswordEnc) {
      throw new NotFoundException("Panel password is not configured for this service");
    }

    const password = decryptSecret(account.panelPasswordEnc);
    const panel = account.panel === "CPANEL" ? "CPANEL" : "PLESK";
    return { html: buildPanelAutoLoginHtml(panel, panelUrl, login, password) };
  }

  private pruneTickets(): void {
    const now = Date.now();
    for (const [key, value] of this.tickets) {
      if (value.expiresAt < now) this.tickets.delete(key);
    }
  }
}
