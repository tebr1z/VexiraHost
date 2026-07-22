import { Injectable } from "@nestjs/common";

import { HostingPanel, ServiceStatus } from "@prisma/client";

import * as net from "node:net";



import {

  createPleskUserSession,

  deletePleskWebspace,

  provisionPleskAccount,

  setPleskWebspaceStatus,

  testPleskApiAuth,

} from "../clients/plesk-api.client";

import type {

  ControlPanelAccountTarget,

  ControlPanelProvisionInput,

  ControlPanelProvisionResult,

  ControlPanelProvider,

  ControlPanelSessionInput,

  ControlPanelSessionResult,

  ControlPanelTestResult,

} from "../interfaces/control-panel-provider.interface";

import {

  buildPleskSessionLoginUrl,

  isMockPanelServer,

  resolvePanelEndpoint,

} from "../utils/panel-endpoint.util";



function hashSeed(input: string): number {

  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {

    hash = (hash + input.charCodeAt(i) * (i + 1)) % 997;

  }

  return hash;

}



function generatePanelPassword(seed: number, username: string): string {

  return `Vx${seed}${username.slice(0, 4)}!aA1`;

}



function testTcpReachable(host: string, port: number, timeoutMs = 5000): Promise<boolean> {

  return new Promise((resolve) => {

    const socket = new net.Socket();

    let settled = false;



    const finish = (ok: boolean) => {

      if (settled) return;

      settled = true;

      socket.destroy();

      resolve(ok);

    };



    socket.setTimeout(timeoutMs);

    socket.once("connect", () => finish(true));

    socket.once("timeout", () => finish(false));

    socket.once("error", () => finish(false));

    socket.connect(port, host);

  });

}



function pleskCredentials(server: ControlPanelSessionInput["server"]) {

  return {

    hostname: server.hostname,

    ipAddress: server.ipAddress,

    panel: "PLESK" as const,

    whmUsername: server.whmUsername,

    whmPasswordEnc: server.whmPasswordEnc,

    apiTokenEnc: server.apiTokenEnc,

  };

}



@Injectable()

export class MockControlPanelProvider implements ControlPanelProvider {

  async provision(input: ControlPanelProvisionInput): Promise<ControlPanelProvisionResult> {

    const endpoint = resolvePanelEndpoint(input.server);

    const seed = hashSeed(`${input.server.id}:${input.username}:${input.primaryDomain}`);

    const panelPassword = generatePanelPassword(seed, input.username);



    if (
      input.panel === HostingPanel.PLESK &&
      !isMockPanelServer(input.server) &&
      (input.server.whmPasswordEnc || input.server.apiTokenEnc) &&
      input.userEmail
    ) {

      const ipParsed = input.server.ipAddress.match(/^([^:]+)/)?.[1] ?? input.server.ipAddress;

      const result = await provisionPleskAccount(pleskCredentials(input.server), {

        primaryDomain: input.primaryDomain,

        username: input.username,

        password: panelPassword,

        email: input.userEmail,

        serverIp: ipParsed,

        planName: input.planName,

      });



      return {

        panelUrl: `${endpoint.sessionOrigin}/smb/web/view`,

        panelUsername: result.panelUsername,

        panelPassword: result.panelPassword,

        panelRef: result.panelRef,

        status: ServiceStatus.ACTIVE,

      };

    }



    const panelRef = `${input.panel.toLowerCase()}-acct-${10000 + (seed % 90000)}`;

    const panelUrl =

      input.panel === HostingPanel.CPANEL

        ? `${endpoint.panelOrigin}/${input.username}`

        : `${endpoint.sessionOrigin}/smb/web/view`;



    return {

      panelUrl,

      panelUsername: input.username,

      panelPassword,

      panelRef,

      status: ServiceStatus.ACTIVE,

    };

  }



  async createSession(
    input: ControlPanelSessionInput,
    clientIp = "127.0.0.1",
    sourceOrigin?: string,
  ): Promise<ControlPanelSessionResult> {
    const login = input.panelUsername.trim();

    if (
      input.server.panel === HostingPanel.PLESK &&
      !isMockPanelServer(input.server) &&
      (input.server.whmPasswordEnc || input.server.apiTokenEnc)
    ) {
      const session = await createPleskUserSession(
        pleskCredentials(input.server),
        login,
        clientIp,
        sourceOrigin,
      );



      return {

        sessionId: session.sessionId,

        loginUrl: session.loginUrl,

        expiresAt: session.expiresAt,

      };

    }



    const endpoint = resolvePanelEndpoint(input.server);

    const token = String(hashSeed(`${login}:${Date.now()}`));



    return {

      sessionId: token,

      loginUrl:

        input.server.panel === HostingPanel.CPANEL

          ? `${endpoint.panelOrigin}/login/?session=${token}&user=${encodeURIComponent(login)}`

          : buildPleskSessionLoginUrl(endpoint, token),

      expiresAt: new Date(Date.now() + 4 * 60 * 1000),

    };

  }



  async testConnection(

    server: ControlPanelSessionInput["server"],

  ): Promise<ControlPanelTestResult> {

    const endpoint = resolvePanelEndpoint(server);

    const host = endpoint.connectHost.trim();



    if (!host) {

      return { ok: false, message: "Hostname or IP address is required" };

    }



    const reachable = await testTcpReachable(host, endpoint.connectPort);

    if (!reachable) {

      return {

        ok: false,

        message: `Cannot reach ${server.panel} admin port on ${host}:${endpoint.connectPort}`,

      };

    }



    if (

      server.panel === HostingPanel.PLESK &&

      !isMockPanelServer(server) &&

      (server.whmPasswordEnc || server.apiTokenEnc)

    ) {

      return testPleskApiAuth(pleskCredentials(server));

    }



    return {

      ok: true,

      message: `${server.panel} admin port ${host}:${endpoint.connectPort} is reachable as ${server.whmUsername}`,

    };

  }

  async suspendAccount(target: ControlPanelAccountTarget): Promise<void> {
    await this.setPleskStatus(target, "suspended");
  }

  async unsuspendAccount(target: ControlPanelAccountTarget): Promise<void> {
    await this.setPleskStatus(target, "active");
  }

  async deleteAccount(target: ControlPanelAccountTarget): Promise<void> {
    if (target.server.panel !== HostingPanel.PLESK || isMockPanelServer(target.server)) {
      return;
    }
    if (!target.server.whmPasswordEnc && !target.server.apiTokenEnc) {
      return;
    }
    await deletePleskWebspace(pleskCredentials(target.server), this.webspaceFilter(target));
  }

  private async setPleskStatus(
    target: ControlPanelAccountTarget,
    status: "active" | "suspended",
  ): Promise<void> {
    if (target.server.panel !== HostingPanel.PLESK || isMockPanelServer(target.server)) {
      return;
    }
    if (!target.server.whmPasswordEnc && !target.server.apiTokenEnc) {
      return;
    }
    await setPleskWebspaceStatus(pleskCredentials(target.server), this.webspaceFilter(target), status);
  }

  private webspaceFilter(target: ControlPanelAccountTarget): { id?: string; name?: string } {
    if (target.panelRef && /^\d+$/.test(target.panelRef)) {
      return { id: target.panelRef };
    }
    return { name: target.primaryDomain };
  }

}


