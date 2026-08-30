import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HostingManagementMode, HostingPanel, ServiceStatus } from "@prisma/client";

import { pleskXmlRequest } from "../clients/plesk-api.client";
import {
  createPleskMailbox,
  deletePleskMailbox,
  listPleskMailboxes,
  updatePleskMailbox,
} from "../clients/plesk-mail-api.client";
import type { CreateMailboxDto, UpdateMailboxDto } from "../dto/mailbox.dto";
import { HostingRepository } from "../repository/hosting.repository";
import type { PleskMailSummary } from "../types/plesk-mail.types";
import { isMockPanelServer } from "../utils/panel-endpoint.util";

import { PanelSessionService } from "./panel-session.service";
import { PleskPanelService } from "./plesk-panel.service";

@Injectable()
export class PleskMailService {
  constructor(
    private readonly hostingRepository: HostingRepository,
    private readonly pleskPanel: PleskPanelService,
    private readonly panelSession: PanelSessionService,
  ) {}

  private async resolveManagedPleskAccount(accountId: string, userId: string) {
    const account = await this.hostingRepository.findByIdForUser(accountId, userId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.status !== ServiceStatus.ACTIVE) {
      throw new BadRequestException("Hosting account is not active");
    }
    if (account.panel !== HostingPanel.PLESK) {
      throw new BadRequestException("Mail management is only available for Plesk hosting");
    }
    if (account.managementMode === HostingManagementMode.MANUAL) {
      throw new BadRequestException("Mail management is not available for manual accounts");
    }
    if (!account.server) {
      throw new BadRequestException("Hosting server is not linked to this account");
    }
    if (!this.pleskPanel.canSync(account.server)) {
      throw new BadRequestException("Plesk mail API is not available for this server");
    }
    return account;
  }

  private mockSummary(domain: string, maxMailboxes: number | null): PleskMailSummary {
    return {
      domain,
      count: 0,
      maxMailboxes,
      mailboxes: [],
    };
  }

  async getMailSummary(accountId: string, userId: string): Promise<PleskMailSummary> {
    const account = await this.resolveManagedPleskAccount(accountId, userId);
    const domain = account.primaryDomain;
    const maxFromPlan = account.plan?.maxEmails ?? null;

    if (isMockPanelServer(account.server!)) {
      return this.mockSummary(domain, maxFromPlan);
    }

    const pleskInfo = await this.pleskPanel.fetchWebspaceInfo(account.server!, account);
    const maxMailboxes = pleskInfo?.maxMailboxes ?? maxFromPlan;

    const credentials = this.pleskPanel.toCredentials(account.server!);
    return listPleskMailboxes(credentials, domain, pleskXmlRequest, maxMailboxes);
  }

  async createMailbox(accountId: string, userId: string, dto: CreateMailboxDto) {
    const account = await this.resolveManagedPleskAccount(accountId, userId);
    const domain = account.primaryDomain;
    const localPart = dto.name.trim().toLowerCase();

    if (isMockPanelServer(account.server!)) {
      throw new BadRequestException("Mail creation is not available on the demo server");
    }

    const summary = await this.getMailSummary(accountId, userId);
    const limit = summary.maxMailboxes;
    if (limit != null && limit > 0 && summary.count >= limit) {
      throw new BadRequestException(`Mailbox limit reached (${limit})`);
    }

    const credentials = this.pleskPanel.toCredentials(account.server!);
    return createPleskMailbox(
      credentials,
      domain,
      { name: localPart, password: dto.password, quotaMb: dto.quotaMb },
      pleskXmlRequest,
    );
  }

  async updateMailbox(accountId: string, userId: string, localPart: string, dto: UpdateMailboxDto) {
    const account = await this.resolveManagedPleskAccount(accountId, userId);
    if (isMockPanelServer(account.server!)) {
      throw new BadRequestException("Mail update is not available on the demo server");
    }

    const credentials = this.pleskPanel.toCredentials(account.server!);
    await updatePleskMailbox(
      credentials,
      account.primaryDomain,
      localPart.trim().toLowerCase(),
      dto,
      pleskXmlRequest,
    );

    return { updated: true };
  }

  async deleteMailbox(accountId: string, userId: string, localPart: string) {
    const account = await this.resolveManagedPleskAccount(accountId, userId);
    if (isMockPanelServer(account.server!)) {
      throw new BadRequestException("Mail deletion is not available on the demo server");
    }

    const credentials = this.pleskPanel.toCredentials(account.server!);
    await deletePleskMailbox(
      credentials,
      account.primaryDomain,
      localPart.trim().toLowerCase(),
      pleskXmlRequest,
    );

    return { deleted: true };
  }

  async createWebmailLoginUrl(accountId: string, userId: string, clientIp: string) {
    const account = await this.resolveManagedPleskAccount(accountId, userId);
    if (account.panel !== HostingPanel.PLESK) {
      throw new ForbiddenException("Webmail login is only available for Plesk");
    }

    const ticket = this.panelSession.createOpenTicket(accountId, userId, clientIp, "/smb/webmail");
    const apiBase =
      process.env.API_PUBLIC_URL?.replace(/\/$/, "") ??
      `http://localhost:${process.env.PORT ?? 4000}/api/v1`;

    return { openUrl: `${apiBase}/hosting/panel-open/${ticket}` };
  }
}
