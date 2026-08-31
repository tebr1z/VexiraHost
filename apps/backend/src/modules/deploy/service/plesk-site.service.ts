import { BadRequestException, Injectable } from "@nestjs/common";
import type { HostingAccount, HostingServer } from "@prisma/client";

import {
  createPleskSubdomainSite,
  getPleskSiteIdByName,
  type PleskServerCredentials,
} from "@/modules/hosting/clients/plesk-api.client";
import { isMockPanelServer } from "@/modules/hosting/utils/panel-endpoint.util";

@Injectable()
export class PleskSiteService {
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
    const existing = await getPleskSiteIdByName(creds, fqdn);
    if (existing) {
      return { siteId: existing, created: false };
    }

    const webspaceId = account.panelRef;
    if (!webspaceId) {
      throw new BadRequestException("Hosting account is missing Plesk subscription id (panelRef)");
    }

    const parentSiteId = await getPleskSiteIdByName(creds, account.primaryDomain);
    if (!parentSiteId) {
      throw new BadRequestException(
        `Primary domain ${account.primaryDomain} was not found on the Plesk server`,
      );
    }

    const { siteId } = await createPleskSubdomainSite(creds, {
      fqdn,
      webspaceId,
      parentSiteId,
    });

    return { siteId, created: true };
  }
}
