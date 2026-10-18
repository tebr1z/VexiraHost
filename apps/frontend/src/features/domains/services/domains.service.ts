import { apiClient } from "@/services/api-client";

export interface DomainSearchResult {
  domain: string;
  tld: string;
  available: boolean;
  price: number;
  currency: string;
  premium: boolean;
}

export interface UserDomain {
  id: string;
  name: string;
  tld: string;
  status: string;
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  nameservers: string[];
  nsGlueRecords: Array<{ host: string; ip: string }>;
  billingAmount?: number | null;
  billingCurrency?: string;
  graceEndsAt?: string | null;
  renewalInvoiceId?: string | null;
  dnsProvider: "LOCAL" | "CLOUDFLARE" | "POWERDNS";
  dnsProviderStatus: string | null;
  dnsLastSyncedAt: string | null;
  dnssecEnabled: boolean;
  dnssecStatus: string | null;
  dnssecDsRecords: string[];
  dnssecUpdatedAt: string | null;
  dnsRecordCount: number;
  createdAt: string;
}

export interface NsGlueEntry {
  host: string;
  ip: string;
}

export interface UpdateNsGlueInput {
  entries: NsGlueEntry[];
  nameservers: string[];
}

export interface DnsRecord {
  id?: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number | null;
  proxied?: boolean;
}

export interface CloudflareDnsStatus {
  configured: boolean;
  connected: boolean;
  status: string | null;
  nameservers: string[];
  lastSyncedAt: string | null;
}

export interface CloudflareSyncResult {
  domain: UserDomain;
  records: DnsRecord[];
}

export interface NameserverStatus {
  domain: string;
  requiredNameservers: string[];
  configuredNameservers: string[];
  detectedNameservers: string[];
  missingNameservers: string[];
  unexpectedNameservers: string[];
  isUsingVexiraNameservers: boolean;
  lookupStatus: "OK" | "PENDING" | "ERROR";
  lookupError: string | null;
  checkedAt: string;
}

export interface DnssecStatus {
  supported: boolean;
  enabled: boolean;
  status: string;
  dsRecords: string[];
  updatedAt: string | null;
}

export async function searchDomains(query: string): Promise<DomainSearchResult[]> {
  const res = await apiClient.request<DomainSearchResult[]>("/domains/search", {
    params: { q: query },
  });
  return res.data ?? [];
}

export async function listDomains(): Promise<UserDomain[]> {
  const res = await apiClient.request<UserDomain[]>("/domains");
  return res.data ?? [];
}

export async function registerDomain(name: string): Promise<UserDomain> {
  const res = await apiClient.request<UserDomain>("/domains/register", {
    method: "POST",
    body: { name },
  });
  return res.data as UserDomain;
}

export async function initiateTransfer(
  domainName: string,
  authCode: string,
): Promise<{ domain: UserDomain; transferStatus: string }> {
  const res = await apiClient.request<{ domain: UserDomain; transferStatus: string }>(
    "/domains/transfer",
    { method: "POST", body: { domainName, authCode } },
  );
  return res.data as { domain: UserDomain; transferStatus: string };
}

export async function getDomain(domainId: string): Promise<UserDomain> {
  const res = await apiClient.request<UserDomain>(`/domains/${domainId}`);
  return res.data as UserDomain;
}

export async function getNameserverStatus(domainId: string): Promise<NameserverStatus> {
  const res = await apiClient.request<NameserverStatus>(`/domains/${domainId}/nameserver-status`);
  return res.data as NameserverStatus;
}

export async function updateNsGlue(
  domainId: string,
  input: UpdateNsGlueInput,
): Promise<{ nsGlueRecords: NsGlueEntry[]; nameservers: string[] }> {
  const res = await apiClient.request<{ nsGlueRecords: NsGlueEntry[]; nameservers: string[] }>(
    `/domains/${domainId}/ns-glue`,
    {
      method: "PUT",
      body: input,
    },
  );
  return res.data as { nsGlueRecords: NsGlueEntry[]; nameservers: string[] };
}

export async function updateNameservers(
  domainId: string,
  nameservers: string[],
): Promise<{ nameservers: string[] }> {
  const res = await apiClient.request<{ nameservers: string[] }>(
    `/domains/${domainId}/nameservers`,
    {
      method: "PUT",
      body: { nameservers },
    },
  );
  return res.data as { nameservers: string[] };
}

export async function getDnsRecords(domainId: string): Promise<DnsRecord[]> {
  const res = await apiClient.request<DnsRecord[]>(`/domains/${domainId}/dns`);
  return res.data ?? [];
}

export async function updateDnsRecords(
  domainId: string,
  records: DnsRecord[],
): Promise<DnsRecord[]> {
  const res = await apiClient.request<DnsRecord[]>(`/domains/${domainId}/dns`, {
    method: "PUT",
    body: {
      records: records.map(({ type, name, value, ttl, priority, proxied }) => ({
        type,
        name,
        value,
        ttl,
        priority: priority ?? undefined,
        proxied: proxied ?? false,
      })),
    },
  });
  return res.data ?? [];
}

export async function getCloudflareDnsStatus(domainId: string): Promise<CloudflareDnsStatus> {
  const res = await apiClient.request<CloudflareDnsStatus>(`/domains/${domainId}/cloudflare`);
  return res.data as CloudflareDnsStatus;
}

export async function connectCloudflareDns(domainId: string): Promise<CloudflareSyncResult> {
  const res = await apiClient.request<CloudflareSyncResult>(
    `/domains/${domainId}/cloudflare/connect`,
    { method: "POST" },
  );
  return res.data as CloudflareSyncResult;
}

export async function syncCloudflareDns(domainId: string): Promise<CloudflareSyncResult> {
  const res = await apiClient.request<CloudflareSyncResult>(
    `/domains/${domainId}/cloudflare/sync`,
    { method: "POST" },
  );
  return res.data as CloudflareSyncResult;
}

export async function disconnectCloudflareDns(domainId: string): Promise<UserDomain> {
  const res = await apiClient.request<UserDomain>(`/domains/${domainId}/cloudflare/disconnect`, {
    method: "POST",
  });
  return res.data as UserDomain;
}

export async function getDnssecStatus(domainId: string): Promise<DnssecStatus> {
  const res = await apiClient.request<DnssecStatus>(`/domains/${domainId}/dnssec`);
  return res.data as DnssecStatus;
}

export async function setDnssecEnabled(domainId: string, enabled: boolean): Promise<DnssecStatus> {
  const res = await apiClient.request<DnssecStatus>(
    `/domains/${domainId}/dnssec/${enabled ? "enable" : "disable"}`,
    { method: "POST" },
  );
  return res.data as DnssecStatus;
}
