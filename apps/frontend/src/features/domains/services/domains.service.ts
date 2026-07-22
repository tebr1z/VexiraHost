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
  dnsRecordCount: number;
  createdAt: string;
}

export interface DnsRecord {
  id?: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number | null;
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
      records: records.map(({ type, name, value, ttl, priority }) => ({
        type,
        name,
        value,
        ttl,
        priority: priority ?? undefined,
      })),
    },
  });
  return res.data ?? [];
}
