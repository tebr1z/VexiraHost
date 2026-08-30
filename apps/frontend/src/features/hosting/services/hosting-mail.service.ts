import { apiClient } from "@/services/api-client";

export interface PleskMailbox {
  id: string | null;
  name: string;
  address: string;
  quotaBytes: number | null;
  usedBytes: number | null;
  enabled: boolean;
  forwarding: string | null;
  autoresponder: boolean;
}

export interface PleskMailSummary {
  domain: string;
  count: number;
  maxMailboxes: number | null;
  mailboxes: PleskMailbox[];
}

export async function getHostingMailSummary(accountId: string): Promise<PleskMailSummary> {
  const res = await apiClient.request<PleskMailSummary>(`/hosting/${accountId}/mail`);
  return res.data as PleskMailSummary;
}

export async function createHostingMailbox(
  accountId: string,
  input: { name: string; password: string; quotaMb?: number },
): Promise<PleskMailbox> {
  const res = await apiClient.request<PleskMailbox>(`/hosting/${accountId}/mailboxes`, {
    method: "POST",
    body: input,
  });
  return res.data as PleskMailbox;
}

export async function updateHostingMailbox(
  accountId: string,
  name: string,
  input: { password?: string; enabled?: boolean },
): Promise<void> {
  await apiClient.request(`/hosting/${accountId}/mailboxes/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteHostingMailbox(accountId: string, name: string): Promise<void> {
  await apiClient.request(`/hosting/${accountId}/mailboxes/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function openHostingWebmail(accountId: string): Promise<void> {
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

  try {
    const res = await apiClient.request<{ openUrl: string }>(
      `/hosting/${accountId}/webmail-login`,
      {
        method: "POST",
        body: {},
      },
    );
    const openUrl = res.data?.openUrl;
    if (!openUrl) throw new Error("Webmail URL missing");

    if (popup && !popup.closed) {
      try {
        popup.opener = null;
      } catch {
        /* ignore */
      }
      popup.location.replace(openUrl);
      return;
    }

    window.location.assign(openUrl);
  } catch (error) {
    popup?.close();
    throw error;
  }
}
