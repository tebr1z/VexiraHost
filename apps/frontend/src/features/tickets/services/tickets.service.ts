import { apiClient } from "@/services/api-client";

export interface TicketRelatedService {
  type: string;
  id: string;
  label: string | null;
}

export interface TicketRelatedServiceOption {
  type: string;
  id: string;
  label: string;
  status: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  relatedService?: TicketRelatedService | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}
export interface TicketAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  requester?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  messages: {
    id: string;
    body: string;
    isStaff: boolean;
    createdAt: string;
    author?: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    };
  }[];
  attachments?: TicketAttachment[];
}

export async function listTickets(): Promise<Ticket[]> {
  const res = await apiClient.request<Ticket[]>("/tickets");
  return res.data ?? [];
}

export async function getTicket(id: string): Promise<TicketDetail> {
  const res = await apiClient.request<TicketDetail>(`/tickets/${id}`);
  return res.data as TicketDetail;
}

export async function listTicketRelatedServices(): Promise<TicketRelatedServiceOption[]> {
  const res = await apiClient.request<TicketRelatedServiceOption[]>("/tickets/related-services");
  return res.data ?? [];
}

export async function createTicket(input: {
  subject: string;
  message: string;
  priority?: string;
  relatedServiceType?: string;
  relatedServiceId?: string;
}): Promise<TicketDetail> {  const res = await apiClient.request<TicketDetail>("/tickets", {
    method: "POST",
    body: input,
  });
  return res.data as TicketDetail;
}

export async function replyTicket(id: string, message: string): Promise<TicketDetail> {
  const res = await apiClient.request<TicketDetail>(`/tickets/${id}/reply`, {
    method: "POST",
    body: { message },
  });
  return res.data as TicketDetail;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function uploadTicketAttachment(
  ticketId: string,
  file: File,
  accessToken: string,
): Promise<TicketAttachment> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const body = (await response.json()) as { data?: unknown; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Upload failed");
  }

  return body.data as TicketAttachment;
}

export async function downloadTicketAttachment(
  attachmentId: string,
  fileName: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tickets/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Download failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
