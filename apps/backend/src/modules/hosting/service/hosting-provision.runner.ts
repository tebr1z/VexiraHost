import { Injectable, Logger } from "@nestjs/common";
import { ServiceStatus } from "@prisma/client";

import { testPleskApiAuth } from "../clients/plesk-api.client";
import { MockControlPanelProvider } from "../providers/mock-control-panel.provider";
import { HostingServersRepository } from "../repository/hosting-servers.repository";
import { HostingRepository } from "../repository/hosting.repository";
import { PROVISION_STAGES } from "../types/provision-stage";
import { isMockPanelServer } from "../utils/panel-endpoint.util";

import { StaffAlertService } from "@/shared/staff-alerts/staff-alert.service";
import { encryptSecret } from "@/utils/crypto.util";

@Injectable()
export class HostingProvisionRunner {
  private readonly logger = new Logger(HostingProvisionRunner.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly hostingRepository: HostingRepository,
    private readonly hostingServersRepository: HostingServersRepository,
    private readonly controlPanel: MockControlPanelProvider,
    private readonly staffAlerts: StaffAlertService,
  ) {}

  enqueue(accountId: string): void {
    if (this.running.has(accountId)) return;
    this.running.add(accountId);
    void this.run(accountId)
      .catch((error) => {
        this.logger.error(
          `Unhandled provisioning error for ${accountId}: ${
            error instanceof Error ? error.message : "unknown"
          }`,
        );
      })
      .finally(() => {
        this.running.delete(accountId);
      });
  }

  private async setStage(accountId: string, stage: string, error?: string | null) {
    await this.hostingRepository.updateAccount(accountId, {
      provisionStage: stage,
      ...(error !== undefined ? { provisionError: error } : {}),
    });
  }

  private async run(accountId: string): Promise<void> {
    const account = await this.hostingRepository.findById(accountId);
    if (!account?.server || !account.plan) return;

    const server = account.server;
    const plan = account.plan;

    try {
      await this.setStage(accountId, PROVISION_STAGES.CONNECTING_PANEL, null);

      if (server.panel === "PLESK" && !isMockPanelServer(server) && server.whmPasswordEnc) {
        const auth = await testPleskApiAuth({
          hostname: server.hostname,
          ipAddress: server.ipAddress,
          panel: "PLESK",
          whmUsername: server.whmUsername,
          whmPasswordEnc: server.whmPasswordEnc,
          apiTokenEnc: server.apiTokenEnc,
        });
        if (!auth.ok) {
          throw new Error(auth.message);
        }
      }

      const userRecord = await this.hostingRepository.findUserEmail(account.userId);
      if (!userRecord?.email) {
        throw new Error("User email is required for hosting provisioning");
      }

      await this.setStage(accountId, PROVISION_STAGES.CREATING_CUSTOMER, null);
      await this.setStage(accountId, PROVISION_STAGES.CREATING_WEBSPACE, null);

      const result = await this.controlPanel.provision({
        server,
        primaryDomain: account.primaryDomain,
        username: account.username,
        panel: plan.panel,
        userEmail: userRecord.email,
        planName: plan.pleskPlanName ?? undefined,
        diskGb: plan.diskGb,
        bandwidthGb: plan.bandwidthGb,
        maxDomains: plan.maxDomains,
        maxEmails: plan.maxEmails,
        maxDatabases: plan.maxDatabases,
      });

      await this.setStage(accountId, PROVISION_STAGES.FINALIZING, null);

      await this.hostingRepository.updateAccount(accountId, {
        status: ServiceStatus.ACTIVE,
        panelUrl: result.panelUrl,
        panelUsername: result.panelUsername,
        panelPasswordEnc: encryptSecret(result.panelPassword),
        panelRef: result.panelRef,
        provisionedAt: new Date(),
        provisionStage: PROVISION_STAGES.COMPLETED,
        provisionError: null,
      });

      await this.hostingServersRepository.incrementAccountCount(server.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hosting provisioning failed";
      this.logger.warn(`Provisioning failed for ${accountId}: ${message}`);

      const latest = await this.hostingRepository.findById(accountId);
      const userRecord = await this.hostingRepository.findUserEmail(account.userId);

      await this.hostingRepository.updateAccount(accountId, {
        status: ServiceStatus.FAILED,
        provisionError: message.slice(0, 500),
      });

      const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      this.staffAlerts.notify({
        kind: "HOSTING_PROVISION_FAILED",
        title: "Hosting quraşdırması uğursuz",
        lines: [
          `Domen: ${account.primaryDomain}`,
          `Müştəri: ${userRecord?.email ?? account.userId}`,
          `Server: ${server.name} (${server.ipAddress})`,
          `Mərhələ: ${latest?.provisionStage ?? "—"}`,
          `Xəta: ${message}`,
        ],
        url: `${appUrl}/t4abriz/panel/hosting/accounts`,
      });
    }
  }
}
