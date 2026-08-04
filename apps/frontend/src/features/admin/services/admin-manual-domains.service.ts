import { apiClient } from "@/services/api-client";

export interface AdminManualDomain {
  id: string;
  name: string;
  tld: string;
  status: string;
  managementMode: string;
  registrarSource: string | null;
  adminNotes: string | null;
  registeredAt: string | null;
  expiresAt: string | null;
  billingAmount: number | null;
  billingCurrency: string;
  graceEndsAt: string | null;
  renewalInvoiceId: string | null;
  nameservers: string[];
  nsGlueRecords: Array<{ host: string; ip: string }>;
  dnsRecordCount: number;
  pendingChangeCount: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface DomainChangeRequest {
  id: string;
  type: "DNS" | "NAMESERVER";
  status: "PENDING" | "APPLIED" | "DISMISSED";
  previousData: unknown;
  requestedData: unknown;
  adminNotifiedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  domain: {
    id: string;
    name: string;
    managementMode: string;
    registrarSource: string | null;
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface AssignManualDomainInput {
  name: string;
  expiresAt?: string;
  nameservers?: string[];
  nsGlueEntries?: Array<{ host: string; ip: string }>;
  extraNameservers?: string[];
  registrarSource?: string;
  billingAmount?: number;
  billingCurrency?: string;
  createInvoiceNow?: boolean;
  dnsRecords?: Array<{
    type: string;
    name: string;
    value: string;
    ttl: number;
    priority?: number;
  }>;
}

export interface UpdateManualDomainInput {
  expiresAt?: string | null;
  nameservers?: string[];
  nsGlueEntries?: Array<{ host: string; ip: string }>;
  registrarSource?: string;
  billingAmount?: number | null;
  billingCurrency?: string;
  createInvoiceNow?: boolean;
}

export async function listUserManualDomains(userId: string): Promise<AdminManualDomain[]> {
  const res = await apiClient.request<AdminManualDomain[]>(`/admin/users/${userId}/domains`);
  return res.data ?? [];
}

export async function assignUserManualDomain(
  userId: string,
  input: AssignManualDomainInput,
): Promise<AdminManualDomain> {
  const res = await apiClient.request<AdminManualDomain>(`/admin/users/${userId}/domains`, {
    method: "POST",
    body: input,
  });
  return res.data as AdminManualDomain;
}

export async function updateUserManualDomain(
  userId: string,
  domainId: string,
  input: UpdateManualDomainInput,
): Promise<AdminManualDomain> {
  const res = await apiClient.request<AdminManualDomain>(
    `/admin/users/${userId}/domains/${domainId}`,
    { method: "PATCH", body: input },
  );
  return res.data as AdminManualDomain;
}

export async function deleteUserManualDomain(userId: string, domainId: string): Promise<void> {
  await apiClient.request(`/admin/users/${userId}/domains/${domainId}`, {
    method: "DELETE",
  });
}

/** @deprecated Use listUserManualDomains from user edit page */
export async function listManualDomains(): Promise<AdminManualDomain[]> {
  const res = await apiClient.request<AdminManualDomain[]>("/admin/domains");
  return res.data ?? [];
}

export async function assignManualDomain(
  userId: string,
  input: AssignManualDomainInput,
): Promise<AdminManualDomain> {
  return assignUserManualDomain(userId, input);
}

export async function listDomainChangeRequests(
  status?: "PENDING" | "APPLIED" | "DISMISSED",
): Promise<DomainChangeRequest[]> {
  const res = await apiClient.request<DomainChangeRequest[]>("/admin/domains/changes", {
    params: status ? { status } : undefined,
  });
  return res.data ?? [];
}

export async function updateDomainChangeStatus(
  id: string,
  status: "APPLIED" | "DISMISSED",
): Promise<DomainChangeRequest> {
  const res = await apiClient.request<DomainChangeRequest>(`/admin/domains/changes/${id}`, {
    method: "PATCH",
    body: { status },
  });
  return res.data as DomainChangeRequest;
}
