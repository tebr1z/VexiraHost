import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import type { HostingPanel, HostingServer, ServiceStatus } from "@prisma/client";
import { HostingPanel as HostingPanelEnum, TicketStatus } from "@prisma/client";

import { listPleskServicePlans, type PleskServerCredentials } from "../clients/plesk-api.client";
import type {
  MigrateHostingAccountsDto,
  UpdateHostingAccountStatusDto,
} from "../dto/hosting-account-admin.dto";
import { MockControlPanelProvider } from "../providers/mock-control-panel.provider";
import { HostingServersRepository } from "../repository/hosting-servers.repository";
import { PROVISION_STAGES } from "../types/provision-stage";
import {
  normalizePanelHostnameForStorage,
  resolvePanelEndpoint,
} from "../utils/panel-endpoint.util";

import { HostingEmailService } from "./hosting-email.service";
import { HostingProvisionRunner } from "./hosting-provision.runner";

import { DeployService } from "@/modules/deploy/service/deploy.service";
import { TicketsService } from "@/modules/tickets/service/tickets.service";
import {
  decryptSecret,
  encryptSecret,
  inspectEncryptedSecret,
  maskSecret,
} from "@/utils/crypto.util";
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
  const panelPasswordState = inspectEncryptedSecret(server.whmPasswordEnc);
  const apiTokenState = inspectEncryptedSecret(server.apiTokenEnc);
  const sshPasswordState = inspectEncryptedSecret(server.sshPasswordEnc);
  const credentialRotationRequired =
    panelPasswordState === "unreadable" ||
    apiTokenState === "unreadable" ||
    sshPasswordState === "unreadable";

  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    ipAddress: server.ipAddress,
    panel: server.panel,
    whmUsername: server.whmUsername,
    whmPassword: includeSecrets ? maskSecret(decryptSecret(server.whmPasswordEnc)) : undefined,
    osVersion: server.osVersion,
    sshUsername: server.sshUsername,
    sshPort: server.sshPort,
    sshPasswordConfigured: Boolean(server.sshPasswordEnc),
    credentialHealth: {
      panelPassword: panelPasswordState,
      apiToken: apiTokenState,
      sshPassword: sshPasswordState,
      rotationRequired: credentialRotationRequired,
    },
    isDefault: server.isDefault,
    isActive: server.isActive,
    maxAccounts: server.maxAccounts,
    accountCount: server.accountCount,
    activeAccountCount: server._count?.accounts ?? server.accountCount,
    lastCheckedAt: server.lastCheckedAt,
    lastConnectionOk: server.lastConnectionOk,
    deployNodeEnabled: server.deployNodeEnabled,
    deployHealth: server.deployHealth,
    deployHealthMessage: server.deployHealthMessage,
    deployHealthCheckedAt: server.deployHealthCheckedAt,
    deployCpuLoadPercent: server.deployCpuLoadPercent,
    deployMemoryUsedMb: server.deployMemoryUsedMb,
    deployMemoryTotalMb: server.deployMemoryTotalMb,
    deployDiskUsedMb: server.deployDiskUsedMb,
    deployDiskTotalMb: server.deployDiskTotalMb,
    deployUptimeSeconds: server.deployUptimeSeconds,
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
  provisionStage: string | null;
  provisionError: string | null;
  provisionedAt: Date | null;
  createdAt: Date;
  cancelRequestedAt?: Date | null;
  cancelApprovedAt?: Date | null;
  scheduledPurgeAt?: Date | null;
  autoDeployDiskGbOverride?: number | null;
  autoDeployMaxAppsOverride?: number | null;
  autoDeployAiCreditsOverride?: number | null;
  autoDeployDiskUsedMb?: number;
  pleskDiskUsedMb?: number;
  storageCheckedAt?: Date | null;
  plan: {
    id: string;
    slug: string;
    name: string;
    diskGb?: number;
    autoDeployDiskGb?: number;
    autoDeployMaxApps?: number;
    autoDeployAiMonthlyCredits?: number;
  };
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
    provisionStage: account.provisionStage,
    provisionError: account.provisionError,
    provisionedAt: account.provisionedAt,
    createdAt: account.createdAt,
    cancelRequestedAt: account.cancelRequestedAt ?? null,
    cancelApprovedAt: account.cancelApprovedAt ?? null,
    scheduledPurgeAt: account.scheduledPurgeAt ?? null,
    autoDeployLimits: {
      diskGb: account.autoDeployDiskGbOverride ?? account.plan.autoDeployDiskGb ?? 0,
      maxApps: account.autoDeployMaxAppsOverride ?? account.plan.autoDeployMaxApps ?? 0,
      aiCredits:
        account.autoDeployAiCreditsOverride ?? account.plan.autoDeployAiMonthlyCredits ?? 0,
      diskGbOverride: account.autoDeployDiskGbOverride ?? null,
      maxAppsOverride: account.autoDeployMaxAppsOverride ?? null,
      aiCreditsOverride: account.autoDeployAiCreditsOverride ?? null,
    },
    storageUsage: {
      autoDeployDiskUsedMb: account.autoDeployDiskUsedMb ?? 0,
      pleskDiskUsedMb: account.pleskDiskUsedMb ?? 0,
      pleskDiskLimitGb: account.plan.diskGb ?? 0,
      checkedAt: account.storageCheckedAt ?? null,
    },
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
  private readonly logger = new Logger(HostingServersService.name);

  constructor(
    private readonly hostingServersRepository: HostingServersRepository,
    private readonly controlPanel: MockControlPanelProvider,
    private readonly hostingEmailService: HostingEmailService,
    private readonly provisionRunner: HostingProvisionRunner,
    @Inject(forwardRef(() => DeployService))
    private readonly deployService: DeployService,
    private readonly ticketsService: TicketsService,
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
    osVersion?: string;
    sshUsername?: string;
    sshPassword?: string;
    sshPort?: number;
    deployNodeEnabled?: boolean;
  }) {
    if (dto.deployNodeEnabled && (!dto.sshUsername?.trim() || !dto.sshPassword?.trim())) {
      throw new BadRequestException("Auto Deploy requires a dedicated SSH username and password");
    }
    const server = await this.hostingServersRepository.create({
      name: dto.name.trim(),
      hostname: normalizePanelHostnameForStorage(dto.hostname, dto.panel),
      ipAddress: dto.ipAddress.trim(),
      panel: dto.panel,
      whmUsername: dto.whmUsername.trim(),
      whmPasswordEnc: encryptSecret(dto.whmPassword),
      apiTokenEnc: dto.apiToken ? encryptSecret(dto.apiToken) : undefined,
      osVersion: dto.osVersion?.trim() || undefined,
      sshUsername: dto.sshUsername?.trim() || undefined,
      sshPasswordEnc: dto.sshPassword ? encryptSecret(dto.sshPassword) : undefined,
      sshPort: dto.sshPort ?? 22,
      deployNodeEnabled: dto.deployNodeEnabled ?? false,
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
      osVersion: string | null;
      sshUsername: string | null;
      sshPassword: string;
      sshPort: number;
      deployNodeEnabled: boolean;
    }>,
  ) {
    const existing = await this.hostingServersRepository.findById(id);
    if (!existing) throw new NotFoundException("Hosting server not found");

    const deployEnabled = dto.deployNodeEnabled ?? existing.deployNodeEnabled;
    if (
      deployEnabled &&
      (!existing.deployNodeEnabled ||
        dto.sshUsername !== undefined ||
        dto.sshPassword !== undefined)
    ) {
      const username = dto.sshUsername === undefined ? existing.sshUsername : dto.sshUsername;
      if (!username?.trim() || (!dto.sshPassword?.trim() && !existing.sshPasswordEnc)) {
        throw new BadRequestException("Auto Deploy requires a dedicated SSH username and password");
      }
    }
    if (
      dto.deployNodeEnabled === false &&
      existing.deployNodeEnabled &&
      (await this.hostingServersRepository.countDeployDependents(id)) > 0
    ) {
      throw new ConflictException(
        "Move linked Auto Deploy packages and applications before disabling this node",
      );
    }

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
      osVersion: dto.osVersion === null ? null : dto.osVersion?.trim(),
      sshUsername: dto.sshUsername === null ? null : dto.sshUsername?.trim(),
      sshPasswordEnc: dto.sshPassword ? encryptSecret(dto.sshPassword) : undefined,
      sshPort: dto.sshPort,
      deployNodeEnabled: dto.deployNodeEnabled,
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
    const [linkedPlans, deployDependents] = await Promise.all([
      this.hostingServersRepository.countLinkedPlans(id),
      this.hostingServersRepository.countDeployDependents(id),
    ]);
    if (linkedPlans > 0 || deployDependents > 0) {
      throw new ConflictException(
        "Move linked packages and Auto Deploy applications before deleting this server",
      );
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

  async updateAccountAutoDeployLimits(
    id: string,
    limits: {
      autoDeployDiskGbOverride?: number | null;
      autoDeployMaxAppsOverride?: number | null;
      autoDeployAiCreditsOverride?: number | null;
    },
  ) {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");
    const updated = await this.hostingServersRepository.updateAccount(id, limits);
    return mapAccount(updated);
  }

  async updateAccountStatus(id: string, dto: UpdateHostingAccountStatusDto) {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.status === "FAILED") {
      throw new BadRequestException(
        "Cannot change status of a failed account — delete or re-provision",
      );
    }

    // Manual / cancelled accounts may have no server — allow DB reactivation without panel calls.
    if (account.server && (account.username || account.panelRef)) {
      const target = {
        server: account.server,
        primaryDomain: account.primaryDomain,
        username: account.username,
        panelRef: account.panelRef,
      };

      if (dto.status === "SUSPENDED") {
        await this.controlPanel.suspendAccount?.(target);
      } else if (
        account.status === "SUSPENDED" ||
        account.status === "CANCELLED" ||
        account.status === "EXPIRED"
      ) {
        await this.controlPanel.unsuspendAccount?.(target);
      }
    }

    const updated = await this.hostingServersRepository.updateAccount(id, {
      status: dto.status,
      ...(dto.status === "ACTIVE"
        ? {
            graceEndsAt: null,
            provisionError: null,
            cancelRequestedAt: null,
            cancelApprovedAt: null,
            scheduledPurgeAt: null,
          }
        : {}),
    });
    return mapAccount(updated);
  }

  /**
   * Payment is already committed when this runs, so a temporary panel outage must
   * not make the invoice look unpaid. Keep the local service active and retrying
   * the panel can be handled operationally from the logged error.
   */
  async resumeAccountAfterPayment(id: string) {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");

    if (account.server && (account.username || account.panelRef)) {
      try {
        await this.controlPanel.unsuspendAccount?.({
          server: account.server,
          primaryDomain: account.primaryDomain,
          username: account.username,
          panelRef: account.panelRef,
        });
      } catch (error) {
        this.logger.error(
          `Panel reactivation failed after payment for hosting ${id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return this.hostingServersRepository.updateAccount(id, {
      status: "ACTIVE",
      graceEndsAt: null,
      provisionError: null,
      cancelRequestedAt: null,
      cancelApprovedAt: null,
      scheduledPurgeAt: null,
    });
  }

  async resolveCancelRequest(id: string, action: "approve" | "deactivate" | "delete" | "reject") {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (!account.cancelRequestedAt && action !== "delete") {
      throw new BadRequestException("No pending cancellation request");
    }

    if (action === "reject") {
      const updated = await this.hostingServersRepository.updateAccount(id, {
        cancelRequestedAt: null,
        cancelApprovedAt: null,
        scheduledPurgeAt: null,
      });
      await this.ticketsService.setCancellationStatusForHosting(id, TicketStatus.CLOSED);
      return { ...mapAccount(updated), message: "Cancellation request rejected" };
    }

    if (action === "delete") {
      await this.ticketsService.setCancellationStatusForHosting(id, TicketStatus.RESOLVED);
      await this.deleteAccount(id);
      return { id, message: "Hosting account and apps deleted" };
    }

    const now = new Date();
    const scheduledPurgeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const updated = await this.hostingServersRepository.updateAccount(id, {
      autoRenew: false,
      cancelRequestedAt: account.cancelRequestedAt ?? now,
      cancelApprovedAt: now,
      scheduledPurgeAt,
    });
    await this.ticketsService.setCancellationStatusForHosting(id, TicketStatus.IN_PROGRESS);
    return {
      ...mapAccount(updated),
      message: "Cancellation approved. Hosting will be deleted from the server within 24 hours.",
    };
  }

  async deleteAccount(id: string) {
    const account = await this.hostingServersRepository.findAccountById(id);
    if (!account) throw new NotFoundException("Hosting account not found");

    await this.deployService.removeAllForAccount(id);

    if (account.server) {
      try {
        await this.controlPanel.deleteAccount?.({
          server: account.server,
          primaryDomain: account.primaryDomain,
          username: account.username,
          panelRef: account.panelRef,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Panel delete failed";
        this.logger.warn(
          `Panel delete skipped for hosting ${id} (${account.primaryDomain}): ${message}`,
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

  async adminRetryProvision(accountId: string) {
    const account = await this.hostingServersRepository.findAccountById(accountId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.status !== "FAILED") {
      throw new BadRequestException("Only failed hosting accounts can be retried");
    }
    if (!account.serverId) {
      throw new BadRequestException("Hosting account has no server assigned");
    }

    await this.hostingServersRepository.updateAccount(accountId, {
      status: "PROVISIONING",
      provisionStage: PROVISION_STAGES.PAYMENT_CONFIRMED,
      provisionError: null,
    });
    this.provisionRunner.enqueue(accountId);

    const refreshed = await this.hostingServersRepository.findAccountById(accountId);
    return mapAccount(refreshed!);
  }

  async adminReassignAndRetryProvision(accountId: string, targetServerId: string) {
    const account = await this.hostingServersRepository.findAccountById(accountId);
    if (!account) throw new NotFoundException("Hosting account not found");
    if (account.panel !== HostingPanelEnum.PLESK) {
      throw new BadRequestException("Only Plesk accounts can be reassigned");
    }
    if (account.status !== "FAILED" && account.status !== "PROVISIONING") {
      throw new BadRequestException(
        "Only failed or provisioning accounts can be reassigned for retry",
      );
    }

    const target = await this.hostingServersRepository.findById(targetServerId);
    if (!target) throw new NotFoundException("Target hosting server not found");
    if (!target.isActive) throw new BadRequestException("Target hosting server is not active");
    if (target.panel !== HostingPanelEnum.PLESK) {
      throw new BadRequestException("Target server must be Plesk");
    }
    if (target.maxAccounts != null && target.accountCount >= target.maxAccounts) {
      throw new BadRequestException("Target hosting server capacity reached");
    }

    const endpoint = resolvePanelEndpoint(target);
    const panelUrl = `${endpoint.sessionOrigin}/smb/web/view`;

    await this.hostingServersRepository.resetAccountForProvisionRetry(accountId, {
      serverId: target.id,
      panelUrl,
    });
    this.provisionRunner.enqueue(accountId);

    const refreshed = await this.hostingServersRepository.findAccountById(accountId);
    return mapAccount(refreshed!);
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
