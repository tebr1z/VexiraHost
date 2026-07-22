import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { HostingAccount, HostingPlan, HostingPanel, HostingServer, ServiceStatus } from "@prisma/client";

import type { ProvisionHostingDto } from "../dto";
import type { PleskWebspaceInfo } from "../types/plesk.types";
import { PROVISION_STAGES } from "../types/provision-stage";
import { HostingProvisionRunner } from "./hosting-provision.runner";
import { PanelSessionService } from "./panel-session.service";
import { PleskPanelService } from "./plesk-panel.service";
import { HostingRepository } from "../repository/hosting.repository";

function mapPlan(plan: HostingPlan) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    panel: plan.panel,
    diskGb: plan.diskGb,
    bandwidthGb: plan.bandwidthGb,
    maxDomains: plan.maxDomains,
    maxEmails: plan.maxEmails,
    maxDatabases: plan.maxDatabases,
    price: Number(plan.price),
    currency: plan.currency,
    billingCycle: plan.billingCycle,
  };
}

function mapServer(server: HostingServer | null | undefined) {
  if (!server) return null;
  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    ipAddress: server.ipAddress,
    panel: server.panel,
  };
}

function mapAccount(
  account: HostingAccount & { plan: HostingPlan; server?: HostingServer | null },
  pleskInfo?: PleskWebspaceInfo | null,
) {
  return {
    id: account.id,
    primaryDomain: account.primaryDomain,
    username: account.username,
    panel: account.panel,
    status: account.status,
    panelUrl: account.panelUrl,
    panelUsername: account.panelUsername,
    panelRef: account.panelRef,
    server: mapServer(account.server),
    orderId: account.orderId,
    provisionedAt: account.provisionedAt,
    provisionStage: account.provisionStage,
    provisionError: account.provisionError,
    createdAt: account.createdAt,
    plan: mapPlan(account.plan),
    pleskInfo: pleskInfo ?? null,
  };
}

function deriveUsername(primaryDomain: string): string {
  const base = primaryDomain
    .split(".")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);

  const normalized = base.match(/^[a-z]/) ? base : `u${base}`;
  return normalized.slice(0, 16) || "userhost";
}

@Injectable()
export class HostingService {
  constructor(
    private readonly hostingRepository: HostingRepository,
    private readonly panelSession: PanelSessionService,
    private readonly pleskPanel: PleskPanelService,
    private readonly provisionRunner: HostingProvisionRunner,
  ) {}

  private async attachPleskInfo(
    account: HostingAccount & { plan: HostingPlan; server?: HostingServer | null },
  ) {
    if (!account.server || account.status !== "ACTIVE") {
      return mapAccount(account, null);
    }

    const pleskInfo = await this.pleskPanel.fetchWebspaceInfo(account.server, account);
    return mapAccount(account, pleskInfo);
  }

  listPlans(panel?: HostingPanel) {
    return this.hostingRepository.findActivePlans(panel).then((plans) => plans.map(mapPlan));
  }

  listForUser(userId: string) {
    return this.hostingRepository
      .findByUserId(userId)
      .then((accounts) => accounts.map((account) => mapAccount(account)));
  }

  async getForUser(id: string, userId: string) {
    const account = await this.hostingRepository.findByIdForUser(id, userId);
    if (!account) throw new NotFoundException("Hosting account not found");
    return this.attachPleskInfo(account);
  }

  async syncPanelInfo(id: string, userId: string) {
    const account = await this.hostingRepository.findByIdForUser(id, userId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (!account.server) {
      throw new BadRequestException("Hosting server is not linked to this account");
    }
    if (!this.pleskPanel.canSync(account.server)) {
      throw new BadRequestException("Plesk panel sync is not available for this account");
    }

    const pleskInfo = await this.pleskPanel.fetchWebspaceInfo(account.server, account);
    if (!pleskInfo) {
      throw new BadRequestException("Could not fetch subscription info from Plesk");
    }

    if (pleskInfo.subscriptionId && pleskInfo.subscriptionId !== account.panelRef) {
      await this.hostingRepository.updateAccount(account.id, {
        panelRef: pleskInfo.subscriptionId,
      });
      account.panelRef = pleskInfo.subscriptionId;
    }

    return mapAccount(account, pleskInfo);
  }

  async provision(
    userId: string,
    dto: ProvisionHostingDto,
    options?: { orderId?: string; requirePaidOrder?: boolean },
  ) {
    if (options?.requirePaidOrder && !options.orderId) {
      throw new BadRequestException(
        "Hosting is activated only after payment. Purchase a plan from the cart/checkout.",
      );
    }

    const plan = await this.hostingRepository.findPlanBySlugAny(dto.planSlug);
    if (!plan) throw new NotFoundException("Hosting plan not found");

    const server = plan.server;
    if (!server) {
      throw new BadRequestException(
        "This hosting plan is not linked to a server. Ask an administrator to configure it.",
      );
    }
    if (!server.isActive) {
      throw new BadRequestException("The hosting server for this plan is not active");
    }
    if (server.panel !== plan.panel) {
      throw new BadRequestException("Hosting plan and server panel mismatch");
    }

    if (server.maxAccounts != null && server.accountCount >= server.maxAccounts) {
      throw new BadRequestException("Hosting server capacity reached");
    }

    const primaryDomain = dto.primaryDomain.trim().toLowerCase();
    const existingDomain = await this.hostingRepository.findByPrimaryDomain(primaryDomain);
    if (existingDomain) throw new ConflictException("Primary domain is already in use");

    let username = (dto.username ?? deriveUsername(primaryDomain)).toLowerCase();
    const existingUsername = await this.hostingRepository.findByUsername(username);
    if (existingUsername) {
      if (dto.username) {
        throw new ConflictException("Username is already taken");
      }
      username = `${username}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 16);
      const retry = await this.hostingRepository.findByUsername(username);
      if (retry) throw new ConflictException("Could not allocate a unique username");
    }

    let account = await this.hostingRepository.createAccount({
      userId,
      planId: plan.id,
      serverId: server.id,
      orderId: options?.orderId,
      primaryDomain,
      username,
      panel: plan.panel,
      status: "PROVISIONING" as ServiceStatus,
      provisionStage: PROVISION_STAGES.PAYMENT_CONFIRMED,
    });

    this.provisionRunner.enqueue(account.id);

    const full = await this.hostingRepository.findByIdForUser(account.id, userId);
    return mapAccount(full!);
  }

  async retryProvision(id: string, userId: string) {
    const account = await this.hostingRepository.findByIdForUser(id, userId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.status !== "FAILED") {
      throw new BadRequestException("Only failed hosting accounts can be retried");
    }

    await this.hostingRepository.updateAccount(account.id, {
      status: "PROVISIONING" as ServiceStatus,
      provisionStage: PROVISION_STAGES.PAYMENT_CONFIRMED,
      provisionError: null,
    });

    this.provisionRunner.enqueue(account.id);

    const full = await this.hostingRepository.findByIdForUser(account.id, userId);
    return mapAccount(full!);
  }

  async createPanelOpenUrl(id: string, userId: string, preferredClientIp?: string) {
    const account = await this.hostingRepository.findByIdForUser(id, userId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.status !== "ACTIVE") {
      throw new BadRequestException("Hosting account is not active yet");
    }
    if (!account.server) {
      throw new BadRequestException("Hosting server is not linked to this account");
    }

    const ticket = this.panelSession.createOpenTicket(id, userId, preferredClientIp);
    const apiBase =
      process.env.API_PUBLIC_URL?.replace(/\/$/, "") ??
      `http://localhost:${process.env.PORT ?? 4000}/api/v1`;

    return { openUrl: `${apiBase}/hosting/panel-open/${ticket}` };
  }

  async createPanelLoginUrl(id: string, userId: string, clientIp: string) {
    const account = await this.hostingRepository.findByIdForUser(id, userId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.status !== "ACTIVE") {
      throw new BadRequestException("Hosting account is not active yet");
    }
    if (!account.server) {
      throw new BadRequestException("Hosting server is not linked to this account");
    }

    return this.panelSession.getOrCreateLoginUrl(id, userId, clientIp);
  }
}
