import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { HostingAccount, HostingServer } from "@prisma/client";

import {
  createPleskSubdomainSite,
  deletePleskSite,
  getPleskSiteInfoByName,
  type PleskServerCredentials,
} from "@/modules/hosting/clients/plesk-api.client";
import { isMockPanelServer } from "@/modules/hosting/utils/panel-endpoint.util";

@Injectable()
export class PleskSiteService {
  private readonly logger = new Logger(PleskSiteService.name);

  toCredentials(server: HostingServer): PleskServerCredentials {
    return {
      hostname: server.hostname,
      ipAddress: server.ipAddress,
      panel: "PLESK",
      whmUsername: server.whmUsername,
      whmPasswordEnc: server.whmPasswordEnc,
      apiTokenEnc: server.apiTokenEnc,
    };
  }

  resolveDeployDomain(
    account: Pick<HostingAccount, "primaryDomain">,
    mode: "PRIMARY" | "SUBDOMAIN",
    subdomain?: string | null,
  ): string {
    if (mode === "PRIMARY") {
      return account.primaryDomain.toLowerCase();
    }

    const label = (subdomain ?? "").trim().toLowerCase();
    if (!label || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      throw new BadRequestException("Subdomain label is invalid");
    }

    return `${label}.${account.primaryDomain.toLowerCase()}`;
  }

  /**
   * Ensure deploy FQDN exists as an addon domain on the subscription
   * (full hosting site in Plesk — not a mail-only subdomain child).
   */
  async ensureSubdomain(
    server: HostingServer,
    account: Pick<HostingAccount, "primaryDomain" | "panelRef">,
    fqdn: string,
  ): Promise<{ siteId: string | null; created: boolean }> {
    if (isMockPanelServer(server)) {
      return { siteId: `mock-site-${fqdn}`, created: true };
    }

    if (server.panel !== "PLESK") {
      throw new BadRequestException("Auto-deploy requires a Plesk hosting server");
    }

    const creds = this.toCredentials(server);
    const existing = await getPleskSiteInfoByName(creds, fqdn);
    if (existing && !existing.parentSiteId) {
      return { siteId: existing.id, created: false };
    }

    // Old child-subdomains open mail in Plesk — replace with a real addon domain.
    if (existing?.parentSiteId) {
      this.logger.log(
        `Converting Plesk child subdomain ${fqdn} (parent ${existing.parentSiteId}) to addon domain`,
      );
      await deletePleskSite(creds, { id: existing.id });
    }

    const webspaceId = account.panelRef;
    if (!webspaceId) {
      throw new BadRequestException("Hosting account is missing Plesk subscription id (panelRef)");
    }

    const { siteId } = await createPleskSubdomainSite(creds, {
      fqdn,
      webspaceId,
    });

    return { siteId, created: true };
  }

  async removeSite(
    server: HostingServer,
    filter: { id?: string | null; name?: string | null },
  ): Promise<void> {
    if (isMockPanelServer(server) || server.panel !== "PLESK") return;

    const id = filter.id?.trim();
    const name = filter.name?.trim();
    if (!id && !name) return;

    try {
      await deletePleskSite(this.toCredentials(server), {
        ...(id ? { id } : {}),
        ...(name ? { name } : {}),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to delete Plesk site ${id ?? name}: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
    }
  }
}
