import type { HostingPanel, HostingServer, ServiceStatus } from "@prisma/client";

export interface ControlPanelProvisionInput {
  server: Pick<
    HostingServer,
    "id" | "hostname" | "ipAddress" | "panel" | "whmUsername" | "whmPasswordEnc" | "apiTokenEnc"
  >;
  primaryDomain: string;
  username: string;
  panel: HostingPanel;
  userEmail: string;
  planName?: string;
  diskGb: number;
  bandwidthGb: number;
  maxDomains: number;
  maxEmails: number;
  maxDatabases: number;
}

export interface ControlPanelProvisionResult {
  panelUrl: string;
  panelUsername: string;
  panelPassword: string;
  panelRef: string;
  status: ServiceStatus;
}

export interface ControlPanelSessionInput {
  server: Pick<
    HostingServer,
    "hostname" | "ipAddress" | "panel" | "whmUsername" | "whmPasswordEnc" | "apiTokenEnc"
  >;
  panelUsername: string;
  panelRef?: string | null;
}

export interface ControlPanelTestInput {
  server: Pick<
    HostingServer,
    "hostname" | "ipAddress" | "panel" | "whmUsername" | "whmPasswordEnc" | "apiTokenEnc"
  >;
}

export interface ControlPanelSessionResult {
  sessionId: string;
  loginUrl: string;
  expiresAt: Date;
}

export interface ControlPanelTestResult {
  ok: boolean;
  message: string;
}

export interface ControlPanelAccountTarget {
  server: ControlPanelSessionInput["server"];
  primaryDomain: string;
  username: string;
  panelRef?: string | null;
}

export interface ControlPanelProvider {
  provision(input: ControlPanelProvisionInput): Promise<ControlPanelProvisionResult>;
  createSession(
    input: ControlPanelSessionInput,
    clientIp?: string,
    sourceOrigin?: string,
  ): Promise<ControlPanelSessionResult>;
  testConnection(server: ControlPanelTestInput["server"]): Promise<ControlPanelTestResult>;
  suspendAccount?(target: ControlPanelAccountTarget): Promise<void>;
  unsuspendAccount?(target: ControlPanelAccountTarget): Promise<void>;
  deleteAccount?(target: ControlPanelAccountTarget): Promise<void>;
}
