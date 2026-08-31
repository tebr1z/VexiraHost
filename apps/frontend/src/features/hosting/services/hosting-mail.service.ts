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
  webmailUrl: string;
}

export interface PleskMailSummary {
  domain: string;
  webmailHost: string;
  webmailUrl: string;
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

function openInNewTab(url: string, popup: Window | null): void {
  if (popup && !popup.closed) {
    try {
      popup.opener = null;
    } catch {
      /* ignore */
    }
    popup.location.replace(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openHostingWebmail(
  accountId: string,
  options?: { mailbox?: string; directUrl?: string },
): Promise<void> {
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

  if (options?.directUrl) {
    openInNewTab(options.directUrl, popup);
    return;
  }

  try {
    const res = await apiClient.request<{
      mode: "direct" | "sso";
      openUrl?: string;
      directUrl?: string;
    }>(`/hosting/${accountId}/webmail-login`, {
      method: "POST",
      body: options?.mailbox ? { mailbox: options.mailbox } : {},
    });

    const data = res.data;
    if (!data) throw new Error("Webmail URL missing");

    const target = data.mode === "direct" ? data.directUrl : (data.openUrl ?? data.directUrl);

    if (!target) throw new Error("Webmail URL missing");

    openInNewTab(target, popup);
  } catch (error) {
    popup?.close();
    throw error;
  }
}
