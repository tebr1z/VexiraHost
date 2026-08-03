import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { HostingPanel, HostingServer, ServiceStatus } from "@prisma/client";
import { HostingPanel as HostingPanelEnum } from "@prisma/client";

import { listPleskServicePlans, type PleskServerCredentials } from "../clients/plesk-api.client";
import type {
  MigrateHostingAccountsDto,
  UpdateHostingAccountStatusDto,
} from "../dto/hosting-account-admin.dto";
import { MockControlPanelProvider } from "../providers/mock-control-panel.provider";
import { HostingServersRepository } from "../repository/hosting-servers.repository";
import {
  normalizePanelHostnameForStorage,
  resolvePanelEndpoint,
} from "../utils/panel-endpoint.util";

import { HostingEmailService } from "./hosting-email.service";

import { decryptSecret, encryptSecret, maskSecret } from "@/utils/crypto.util";
import { resolveUniqueSlug, slugify } from "@/utils/slug.util";

function toPleskCredentials(server: HostingServer): PleskServerCredentials {
  return {
    hostname: server.hostname,
    ipAddress: server.ipAddress,
    panel: "PLESK",
    whmUsername: server.whmUsername,
    whmPasswordEnc: server.whmPasswordEnc,
    apiTokenEnc: server.apiTokenEnc,
  };
}

function mapServer(
  server: HostingServer & { _count?: { accounts: number } },
  includeSecrets = false,
) {
  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    ipAddress: server.ipAddress,
    panel: server.panel,
    whmUsername: server.whmUsername,
    whmPassword: includeSecrets ? maskSecret(decryptSecret(server.whmPasswordEnc)) : undefined,
    isDefault: server.isDefault,
    isActive: server.isActive,
    maxAccounts: server.maxAccounts,
    accountCount: server.accountCount,
    activeAccountCount: server._count?.accounts ?? server.accountCount,
    lastCheckedAt: server.lastCheckedAt,
    lastConnectionOk: server.lastConnectionOk,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
}

function mapAccount(account: {
  id: string;
  primaryDomain: string;
  username: string;
  panel: HostingPanel;
  status: ServiceStatus;
  panelUrl: string | null;
  provisionedAt: Date | null;
  createdAt: Date;
  plan: { id: string; slug: string; name: string };
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  server?: {
    id: string;
    name: string;
    ipAddress: string;
    panel?: HostingPanel;
    isActive?: boolean;
  } | null;
}) {
  return {
    id: account.id,
    primaryDomain: account.primaryDomain,
    username: account.username,
    panel: account.panel,
    status: account.status,
    panelUrl: account.panelUrl,
    provisionedAt: account.provisionedAt,
    createdAt: account.createdAt,
    plan: {
      id: account.plan.id,
      slug: account.plan.slug,
      name: account.plan.name,
    },
    server: account.server
      ? {
          id: account.server.id,
          name: account.server.name,
          ipAddress: account.server.ipAddress,
          panel: account.server.panel ?? account.panel,
          isActive: account.server.isActive ?? true,
        }
      : null,
    customer: {
      id: account.user.id,
      email: account.user.email,
      firstName: account.user.firstName,
      lastName: account.user.lastName,
    },
  };
}

@Injectable()
export class HostingServersService {
  constructor(
    private readonly hostingServersRepository: HostingServersRepository,
    private readonly controlPanel: MockControlPanelProvider,
    private readonly hostingEmailService: HostingEmailService,
  ) {}

  listServers() {
    return this.hostingServersRepository
      .findAll()
      .then((servers) => servers.map((s) => mapServer(s)));
  }

  async getServer(id: string) {
    const server = await this.hostingServersRepository.findById(id);
    if (!server) throw new NotFoundException("Hosting server not found");
    return mapServer(server);
  }

  async createServer(dto: {
    name: string;
    hostname: string;
    ipAddress: string;
    panel: HostingPanel;
    whmUsername: string;
    whmPassword: string;
    apiToken?: string;
    isDefault?: boolean;
    isActive?: boolean;
    maxAccounts?: number;
  }) {
    const server = await this.hostingServersRepository.create({
      name: dto.name.trim(),
      hostname: normalizePanelHostnameForStorage(dto.hostname, dto.panel),
      ipAddress: dto.ipAddress.trim(),
      panel: dto.panel,
      whmUsername: dto.whmUsername.trim(),
      whmPasswordEnc: encryptSecret(dto.whmPassword),
      apiTokenEnc: dto.apiToken ? encryptSecret(dto.apiToken) : undefined,
      isDefault: dto.isDefault,
      isActive: dto.isActive ?? true,
      maxAccounts: dto.maxAccounts,
    });

    return mapServer(server);
  }

  async updateServer(
    id: string,
    dto: Partial<{
      name: string;
      hostname: string;
      ipAddress: string;
      panel: HostingPanel;
      whmUsername: string;
      whmPassword: string;
      apiToken: string | null;
      isDefault: boolean;
      isActive: boolean;
      maxAccounts: number | null;
    }>,
  ) {
    const existing = await this.hostingServersRepository.findById(id);
    if (!existing) throw new NotFoundException("Hosting server not found");

    const server = await this.hostingServersRepository.update(id, {
      name: dto.name?.trim(),
      hostname:
        dto.hostname !== undefined
          ? normalizePanelHostnameForStorage(dto.hostname, dto.panel ?? existing.panel)
          : undefined,
      ipAddress: dto.ipAddress?.trim(),
      panel: dto.panel,
      whmUsername: dto.whmUsername?.trim(),
      whmPasswordEnc: dto.whmPassword ? encryptSecret(dto.whmPassword) : undefined,
      apiTokenEnc:
        dto.apiToken === null ? null : dto.apiToken ? encryptSecret(dto.apiToken) : undefined,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
      maxAccounts: dto.maxAccounts,
    });

    return mapServer(server);
  }

  async deleteServer(id: string) {
    const existing = await this.hostingServersRepository.findById(id);
    if (!existing) throw new NotFoundException("Hosting server not found");

    const accountCount = await this.hostingServersRepository.countAccounts(id);
    if (accountCount > 0) {
      throw new ConflictException("Cannot delete a server that still has hosting accounts");
    }

    await this.hostingServersRepository.delete(id);
    return { deleted: true };
  }

  async testServer(id: string) {
    const server = await this.hostingServersRepository.findById(id);
    if (!server) throw new NotFoundException("Hosting server not found");

    const result = await this.controlPanel.testConnection(server);
    const checkedAt = new Date();
    await this.hostingServersRepository.update(id, {
      lastCheckedAt: checkedAt,
      lastConnectionOk: result.ok,
    });
    return {
      ...result,
      lastCheckedAt: checkedAt,
      lastConnectionOk: result.ok,
    };
  }

  async listServerAccounts(id: string, activeOnly = true) {
    const server = await this.hostingServersRepository.findById(id);
    if (!server) throw new NotFoundException("Hosting server not found");

    const accounts = await this.hostingServersRepository.findAccountsByServerId(id, activeOnly);
    return accounts.map((account) => mapAccount(account));
  }

  listAccounts() {
    return this.hostingServersRepository
      .findAllAccounts()
      .then((accounts) => accounts.map((account) => mapAccount(account)));
  }

  async updateAccountStatus(id: string, dto: UpdateHostingAccountStatusDto) {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (!account.server) {
      throw new BadRequestException("Hosting account is not linked to a server");
    }
    if (account.status === "CANCELLED" || account.status === "FAILED") {
      throw new BadRequestException("Cannot change status of a cancelled or failed account");
    }

    const target = {
      server: account.server,
      primaryDomain: account.primaryDomain,
      username: account.username,
      panelRef: account.panelRef,
    };

    if (dto.status === "SUSPENDED") {
      await this.controlPanel.suspendAccount?.(target);
    } else {
      await this.controlPanel.unsuspendAccount?.(target);
    }

    const updated = await this.hostingServersRepository.updateAccount(id, {
      status: dto.status,
    });
    return mapAccount(updated);
  }

  async deleteAccount(id: string) {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");

    if (account.server) {
      try {
        await this.controlPanel.deleteAccount?.({
          server: account.server,
          primaryDomain: account.primaryDomain,
          username: account.username,
          panelRef: account.panelRef,
        });
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : "Failed to delete account on panel",
        );
      }
    }

    await this.hostingServersRepository.deleteAccount(id);
    if (account.serverId) {
      await this.hostingServersRepository.decrementAccountCount(account.serverId);
    }

    await this.hostingEmailService.sendAccountDeletedEmail({
      to: account.user.email,
      firstName: account.user.firstName,
      lastName: account.user.lastName,
      preferredCurrency: account.user.preferredCurrency,
      domain: account.primaryDomain,
      planName: account.plan.name,
      username: account.username,
      serverName: account.server?.name ?? null,
      deletedAt: new Date(),
    });

    return { deleted: true };
  }

  async migrateAccounts(dto: MigrateHostingAccountsDto) {
    const target = await this.hostingServersRepository.findById(dto.targetServerId);
    if (!target) throw new NotFoundException("Target hosting server not found");
    if (!target.isActive) {
      throw new BadRequestException("Target hosting server is not active");
    }
    if (target.panel !== HostingPanelEnum.PLESK) {
      throw new BadRequestException("Only Plesk → Plesk migration is supported");
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const accountId of dto.accountIds) {
      try {
        await this.migrateSingleAccount(accountId, target);
        results.push({ id: accountId, ok: true });
      } catch (error) {
        results.push({
          id: accountId,
          ok: false,
          error: error instanceof Error ? error.message : "Migration failed",
        });
      }
    }

    const migrated = results.filter((r) => r.ok).length;
    if (migrated === 0) {
      throw new BadRequestException(results[0]?.error ?? "Could not migrate any selected accounts");
    }

    return { migrated, failed: results.length - migrated, results };
  }

  async getRemotePleskPlans(serverId: string) {
    const server = await this.requirePleskServer(serverId);
    const remote = await listPleskServicePlans(toPleskCredentials(server));
    return Promise.all(
      remote.map(async (plan) => {
        const local = await this.hostingServersRepository.findPlanByServerAndPleskName(
          serverId,
          plan.name,
        );
        return {
          ...plan,
          alreadySynced: Boolean(local),
          localPlanId: local?.id ?? null,
          localSlug: local?.slug ?? null,
          localIsActive: local?.isActive ?? null,
        };
      }),
    );
  }

  async syncPleskPlans(serverId: string) {
    const server = await this.requirePleskServer(serverId);
    const remote = await listPleskServicePlans(toPleskCredentials(server));
    if (remote.length === 0) {
      return {
        created: 0,
        updated: 0,
        plans: [] as Array<{ id: string; slug: string; name: string; action: string }>,
      };
    }

    const results: Array<{
      id: string;
      slug: string;
      name: string;
      action: "created" | "updated";
    }> = [];
    let created = 0;
    let updated = 0;

    for (const remotePlan of remote) {
      const existing = await this.hostingServersRepository.findPlanByServerAndPleskName(
        serverId,
        remotePlan.name,
      );

      if (existing) {
        const plan = await this.hostingServersRepository.updateHostingPlanLimits(existing.id, {
          name: remotePlan.name,
          diskGb: remotePlan.diskGb,
          bandwidthGb: remotePlan.bandwidthGb,
          maxDomains: remotePlan.maxDomains,
          maxEmails: remotePlan.maxEmails,
          maxDatabases: remotePlan.maxDatabases,
        });
        updated += 1;
        results.push({ id: plan.id, slug: plan.slug, name: plan.name, action: "updated" });
        continue;
      }

      const baseSlug = `${slugify(remotePlan.name) || "plesk-plan"}-${slugify(server.name) || "server"}`;
      const slug = await resolveUniqueSlug(baseSlug, (candidate) =>
        this.hostingServersRepository.hostingPlanSlugExists(candidate),
      );

      const plan = await this.hostingServersRepository.createHostingPlan({
        slug,
        name: remotePlan.name,
        description: `Synced from Plesk (${server.name})`,
        panel: HostingPanelEnum.PLESK,
        serverId: server.id,
        diskGb: remotePlan.diskGb,
        bandwidthGb: remotePlan.bandwidthGb,
        maxDomains: remotePlan.maxDomains,
        maxEmails: remotePlan.maxEmails,
        maxDatabases: remotePlan.maxDatabases,
        price: 0,
        isActive: false,
        sortOrder: created + updated,
        pleskPlanName: remotePlan.name,
      });
      created += 1;
      results.push({ id: plan.id, slug: plan.slug, name: plan.name, action: "created" });
    }

    return { created, updated, total: remote.length, plans: results };
  }

  private async requirePleskServer(serverId: string) {
    const server = await this.hostingServersRepository.findById(serverId);
    if (!server) throw new NotFoundException("Hosting server not found");
    if (server.panel !== HostingPanelEnum.PLESK) {
      throw new BadRequestException("Plan sync is only available for Plesk servers");
    }
    return server;
  }

  private async migrateSingleAccount(accountId: string, target: HostingServer) {
    const account = await this.hostingServersRepository.findAccountById(accountId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.panel !== HostingPanelEnum.PLESK) {
      throw new BadRequestException("Only Plesk accounts can be migrated");
    }
    if (account.serverId === target.id) {
      throw new BadRequestException("Account is already on the target server");
    }
    if (account.status === "CANCELLED") {
      throw new BadRequestException("Cannot migrate a cancelled account");
    }
    if (target.maxAccounts != null && target.accountCount >= target.maxAccounts) {
      throw new BadRequestException("Target hosting server capacity reached");
    }

    const endpoint = resolvePanelEndpoint(target);
    const panelUrl = `${endpoint.sessionOrigin}/smb/web/view`;
    const previousServerId = account.serverId;

    await this.hostingServersRepository.updateAccount(accountId, {
      serverId: target.id,
      panelUrl,
    });

    if (previousServerId) {
      await this.hostingServersRepository.decrementAccountCount(previousServerId);
    }
    await this.hostingServersRepository.incrementAccountCount(target.id);
  }
}
