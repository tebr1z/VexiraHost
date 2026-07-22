import { Injectable } from "@nestjs/common";
import { HostingPanel, type HostingAccount, type HostingServer } from "@prisma/client";

import {
  getPleskWebspaceInfo,
  type PleskServerCredentials,
} from "../clients/plesk-api.client";
import type { PleskWebspaceInfo } from "../types/plesk.types";
import { isMockPanelServer } from "../utils/panel-endpoint.util";

@Injectable()
export class PleskPanelService {
  canSync(server: Pick<HostingServer, "hostname" | "ipAddress" | "panel" | "whmPasswordEnc">): boolean {
    return (
      server.panel === HostingPanel.PLESK &&
      !isMockPanelServer(server) &&
      Boolean(server.whmPasswordEnc)
    );
  }

  toCredentials(
    server: Pick<
      HostingServer,
      "hostname" | "ipAddress" | "whmUsername" | "whmPasswordEnc" | "apiTokenEnc"
    >,
  ): PleskServerCredentials {
    return {
      hostname: server.hostname,
      ipAddress: server.ipAddress,
      panel: "PLESK",
      whmUsername: server.whmUsername,
      whmPasswordEnc: server.whmPasswordEnc,
      apiTokenEnc: server.apiTokenEnc,
    };
  }

  async fetchWebspaceInfo(
    server: HostingServer,
    account: Pick<HostingAccount, "panelRef" | "primaryDomain">,
  ): Promise<PleskWebspaceInfo | null> {
    if (!this.canSync(server)) return null;

    const credentials = this.toCredentials(server);
    const filter = account.panelRef
      ? { id: account.panelRef }
      : { name: account.primaryDomain };

    try {
      return await getPleskWebspaceInfo(credentials, filter);
    } catch {
      if (account.panelRef && account.panelRef !== account.primaryDomain) {
        try {
          return await getPleskWebspaceInfo(credentials, { name: account.primaryDomain });
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
