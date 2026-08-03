export interface PleskWebspaceInfo {
  subscriptionId: string | null;
  domain: string | null;
  status: "active" | "suspended" | "unknown";
  ownerId: string | null;
  ipAddress: string | null;
  diskUsedBytes: number | null;
  diskLimitBytes: number | null;
  trafficUsedBytes: number | null;
  trafficLimitBytes: number | null;
  maxDomains: number | null;
  maxMailboxes: number | null;
  maxDatabases: number | null;
  ftpLogin: string | null;
  hostingType: string | null;
  diskUsage: Record<string, number>;
  syncedAt: string;
}

export interface PleskServerInfo {
  serverName: string | null;
  version: string | null;
  os: string | null;
}

export interface PleskServicePlan {
  id: string | null;
  name: string;
  diskGb: number;
  bandwidthGb: number;
  maxDomains: number;
  maxEmails: number;
  maxDatabases: number;
  unlimitedDisk: boolean;
  unlimitedBandwidth: boolean;
}
