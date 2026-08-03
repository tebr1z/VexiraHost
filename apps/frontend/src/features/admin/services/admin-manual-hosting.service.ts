import { apiClient } from "@/services/api-client";

export interface AdminManualHostingAccount {
  id: string;
  primaryDomain: string;
  username: string;
  panel: "PLESK" | "CPANEL" | string;
  status: string;
  managementMode: string;
  serviceCategory: "HOSTING" | "SERVER" | null;
  panelIp: string | null;
  panelUrl: string | null;
  panelUsername: string | null;
  expiresAt: string | null;
  billingAmount: number | null;
  billingCurrency: string;
  graceEndsAt: string | null;
  renewalInvoiceId: string | null;
  provisionedAt: string | null;
  createdAt: string;
  plan: { id: string; name: string; slug: string };
  server: { id: string; name: string; ipAddress: string } | null;
}

export interface AssignManualHostingInput {
  label: string;
  serviceCategory: "HOSTING" | "SERVER";
  panel?: "PLESK" | "CPANEL";
  panelIp: string;
  panelUrl?: string;
  panelUsername: string;
  panelPassword: string;
  expiresAt?: string;
  billingAmount?: number;
  billingCurrency?: string;
  createInvoiceNow?: boolean;
  planId?: string;
  serverId?: string;
}

export interface UpdateManualHostingInput {
  serviceCategory?: "HOSTING" | "SERVER";
  panel?: "PLESK" | "CPANEL";
  panelIp?: string;
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
  expiresAt?: string | null;
  billingAmount?: number | null;
  billingCurrency?: string;
  createInvoiceNow?: boolean;
}

export async function listUserManualHostingAccounts(
  userId: string,
): Promise<AdminManualHostingAccount[]> {
  const res = await apiClient.request<AdminManualHostingAccount[]>(
    `/admin/users/${userId}/hosting-accounts`,
  );
  return res.data ?? [];
}

export async function assignUserManualHostingAccount(
  userId: string,
  input: AssignManualHostingInput,
): Promise<AdminManualHostingAccount> {
  const res = await apiClient.request<AdminManualHostingAccount>(
    `/admin/users/${userId}/hosting-accounts`,
    { method: "POST", body: input },
  );
  return res.data as AdminManualHostingAccount;
}

export async function updateUserManualHostingAccount(
  userId: string,
  accountId: string,
  input: UpdateManualHostingInput,
): Promise<AdminManualHostingAccount> {
  const res = await apiClient.request<AdminManualHostingAccount>(
    `/admin/users/${userId}/hosting-accounts/${accountId}`,
    { method: "PATCH", body: input },
  );
  return res.data as AdminManualHostingAccount;
}
