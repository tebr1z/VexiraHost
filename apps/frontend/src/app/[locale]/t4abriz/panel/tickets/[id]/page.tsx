"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { TicketMessageThread } from "@/components/tickets/ticket-message-thread";
import { PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { updateAdminTicketStatus } from "@/features/admin/services/admin.service";
import {
  downloadTicketAttachment,
  getTicket,
  replyTicket,
  uploadTicketAttachment,
  type TicketAttachment,
  type TicketDetail,
} from "@/features/tickets";
import { isKnownStatus } from "@/lib/i18n/status";
import { useAuthStore } from "@/stores/auth-store";

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const;

export default function AdminTicketDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const ta = useTranslations("admin");
  const tat = useTranslations("admin.pages.tickets");
  const ts = useTranslations("ui.status");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.tickets");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = () =>
    getTicket(id)
      .then(setTicket)
      .catch(() => setError(tc("ticketAccessDenied")));

  useEffect(() => {
    load();
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyTicket(id, reply.trim());
      setReply("");
      await load();
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket || status === ticket.status) return;
    setStatusUpdating(true);
    setStatusError(null);
    try {
      await updateAdminTicketStatus(id, status);
      setTicket((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      setStatusError(tat("statusUpdateFailed"));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpload = async (file: File) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadTicketAttachment(id, file, token);
      await load();
    } catch {
      setUploadError(tp("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: TicketAttachment) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    await downloadTicketAttachment(attachment.id, attachment.fileName, token);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-error">{error}</p>
        <Link href="/t4abriz/panel/tickets" className="text-secondary hover:underline">
          {tc("backToTickets")}
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return <p className="text-on-surface-variant">{tu("loading")}</p>;
  }

  const requester = ticket.requester;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={ticket.subject}
        description={requester ? tc("fromEmail", { email: requester.email }) : undefined}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.tickets"), href: "/t4abriz/panel/tickets" },
          { label: ticket.subject },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4">
        <StatusBadge status={ticket.status} />
        <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm capitalize text-on-surface-variant">
          {tc("priorityLabel", { priority: ticket.priority.toLowerCase() })}
        </span>
        <div className="ml-auto flex flex-col items-end gap-1">
          <label htmlFor="ticket-status" className="text-xs font-medium text-[var(--label-secondary)]">
            {tat("changeStatus")}
          </label>
          <select
            id="ticket-status"
            value={ticket.status}
            disabled={statusUpdating}
            onChange={(e) => void handleStatusChange(e.target.value)}
            className="rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 py-2 text-sm disabled:opacity-60"
          >
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {isKnownStatus(status) ? ts(status) : status}
              </option>
            ))}
          </select>
          {statusError && <p className="text-xs text-error">{statusError}</p>}
        </div>
      </div>

      {ticket.relatedService?.label && (
        <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-3">
          <p className="text-xs font-medium text-[var(--label-tertiary)]">{tp("relatedService")}</p>
          <p className="mt-1 text-sm font-medium text-[var(--label-primary)]">{ticket.relatedService.label}</p>
        </div>
      )}

      <TicketMessageThread messages={ticket.messages} locale={locale} viewer="admin" />

      <section className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
        <h2 className="mb-3 font-semibold text-primary">{tp("attachments")}</h2>
        {(ticket.attachments?.length ?? 0) > 0 && (
          <ul className="mb-3 space-y-2">
            {ticket.attachments!.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{attachment.fileName}</span>
                <button
                  type="button"
                  onClick={() => void handleDownload(attachment)}
                  className="text-secondary hover:underline"
                >
                  {tc("download")}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mb-3 text-xs text-on-surface-variant">{tp("maxFileSize")}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {uploading ? tp("uploading") : tp("uploadAttachment")}
        </button>
        {uploadError && <p className="mt-2 text-sm text-error">{uploadError}</p>}
      </section>

      <form onSubmit={handleReply} className="space-y-3 rounded-2xl border border-outline-variant/50 bg-surface p-5">
        <h2 className="font-semibold text-primary">{tc("staffReply")}</h2>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder={tc("staffReplyPlaceholder")}
          className="w-full rounded-xl border border-outline-variant px-4 py-3"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {sending ? tc("sending") : tc("sendReply")}
        </button>
      </form>
    </div>
  );
}
