"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { TicketMessageThread } from "@/components/tickets/ticket-message-thread";
import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  downloadTicketAttachment,
  getTicket,
  replyTicket,
  uploadTicketAttachment,
  type TicketAttachment,
  type TicketDetail,
} from "@/features/tickets";
import { useAuthStore } from "@/stores/auth-store";

export default function TicketDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.tickets");
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = () =>
    getTicket(id)
      .then(setTicket)
      .finally(() => setLoading(false));

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

  if (loading) {
    return <LoadingSkeletonList rows={3} />;
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <p className="text-error">{tc("ticketNotFound")}</p>
        <Link href="/dashboard/tickets" className="text-secondary hover:underline">
          {tc("backToTickets")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`${ticket.priority.toLowerCase()} · ${ticket.status.toLowerCase().replace(/_/g, " ")}`}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.support"), href: "/dashboard/tickets" },
          { label: ticket.subject },
        ]}
      />

      {ticket.relatedService?.label && (
        <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-3">
          <p className="text-xs font-medium text-[var(--label-tertiary)]">{tp("relatedService")}</p>
          <p className="mt-1 text-sm font-medium text-[var(--label-primary)]">{ticket.relatedService.label}</p>
        </div>
      )}

      <TicketMessageThread messages={ticket.messages} locale={locale} viewer="customer" />

      <section className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
        <h2 className="mb-3 font-semibold text-primary">{tp("attachments")}</h2>
        {(ticket.attachments?.length ?? 0) > 0 && (
          <ul className="mb-3 space-y-2">
            {ticket.attachments!.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{attachment.fileName}</span>
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
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
        <h2 className="font-semibold text-primary">{tc("reply")}</h2>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder={tc("replyPlaceholder")}
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
