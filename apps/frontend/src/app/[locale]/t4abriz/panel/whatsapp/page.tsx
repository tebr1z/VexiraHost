"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import {
  connectWhatsapp,
  disconnectWhatsapp,
  getWhatsappQr,
  getWhatsappStatus,
  listWhatsappMessages,
  listWhatsappUsers,
  sendWhatsappMessage,
  type WhatsappConnectionStatus,
  type WhatsappMessageLog,
  type WhatsappStatus,
  type WhatsappUserOption,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

function statusTone(status: WhatsappConnectionStatus): "ACTIVE" | "PENDING" | "SUSPENDED" {
  if (status === "CONNECTED") return "ACTIVE";
  if (status === "QR_READY" || status === "CONNECTING") return "PENDING";
  return "SUSPENDED";
}

export default function AdminWhatsappPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.whatsapp");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [users, setUsers] = useState<WhatsappUserOption[]>([]);
  const [messages, setMessages] = useState<WhatsappMessageLog[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    const next = await getWhatsappStatus();
    setStatus(next);
    return next;
  }, []);

  const loadMessages = useCallback(async () => {
    const rows = await listWhatsappMessages();
    setMessages(rows);
  }, []);

  const loadUsers = useCallback(async (q?: string) => {
    const rows = await listWhatsappUsers(q);
    setUsers(rows);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStatus(), loadMessages(), loadUsers()]);
    } catch (err) {
      toast(getApiErrorMessage(err, tp("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [loadMessages, loadStatus, loadUsers, tp]);

  useEffect(() => {
    if (!isAdmin) return;
    void refreshAll();
  }, [isAdmin, refreshAll]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!status || status.status === "CONNECTED" || status.status === "DISCONNECTED") {
      if (status?.status === "CONNECTED") setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const [qr, nextStatus] = await Promise.all([getWhatsappQr(), getWhatsappStatus()]);
        if (cancelled) return;
        setStatus(nextStatus);
        setQrDataUrl(qr.qrDataUrl);
        if (nextStatus.status === "CONNECTED") {
          setQrDataUrl(null);
          void loadMessages();
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAdmin, loadMessages, status?.status]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  useEffect(() => {
    if (selectedUser?.phone) setPhone(selectedUser.phone);
  }, [selectedUser]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const next = await connectWhatsapp();
      setStatus(next);
      toast(tp("connectStarted"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("connectFailed")), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(tp("disconnectConfirm"))) return;
    setBusy(true);
    try {
      const next = await disconnectWhatsapp();
      setStatus(next);
      setQrDataUrl(null);
      toast(tp("disconnected"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("disconnectFailed")), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendWhatsappMessage({
        userId: selectedUserId || undefined,
        phone: phone.trim() || undefined,
        message: message.trim(),
      });
      setMessage("");
      toast(tp("sendSuccess"), "success");
      await loadMessages();
    } catch (err) {
      toast(getApiErrorMessage(err, tp("sendFailed")), "error");
    } finally {
      setSending(false);
    }
  };

  if (!isAdmin) {
    return <p className="text-on-surface-variant">{tp("adminOnly")}</p>;
  }

  const connectionStatus = status?.status ?? "DISCONNECTED";
  const connected = connectionStatus === "CONNECTED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
      />

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={statusTone(connectionStatus)} />
              <span className="text-on-surface text-sm font-medium">
                {tp(`status.${connectionStatus}`)}
              </span>
            </div>
            {status?.phoneNumber ? (
              <p className="text-on-surface-variant text-sm">
                {tp("linkedNumber", { phone: status.phoneNumber })}
              </p>
            ) : (
              <p className="text-on-surface-variant text-sm">{tp("notLinked")}</p>
            )}
            {status?.lastError ? <p className="text-error text-sm">{status.lastError}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || connected}
              onClick={() => void handleConnect()}
              className="bg-primary text-on-primary h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? tp("working") : tp("connect")}
            </button>
            <button
              type="button"
              disabled={busy || connectionStatus === "DISCONNECTED"}
              onClick={() => void handleDisconnect()}
              className="border-outline-variant h-10 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
            >
              {tp("disconnect")}
            </button>
          </div>
        </div>

        {(connectionStatus === "QR_READY" || connectionStatus === "CONNECTING") && (
          <div className="border-outline-variant bg-surface-container-low/40 mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed p-6">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={tp("qrAlt")}
                className="h-64 w-64 rounded-lg bg-white p-2"
              />
            ) : (
              <p className="text-on-surface-variant text-sm">{tp("qrWaiting")}</p>
            )}
            <p className="text-on-surface-variant max-w-md text-center text-sm">{tp("qrHelp")}</p>
          </div>
        )}
      </section>

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <h2 className="text-on-surface mb-1 text-lg font-semibold">{tp("sendTitle")}</h2>
        <p className="text-on-surface-variant mb-4 text-sm">{tp("sendHelp")}</p>
        <form onSubmit={(e) => void handleSend(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{tp("selectUser")}</label>
              <div className="flex gap-2">
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={tp("searchUsers")}
                  className="border-outline-variant h-11 w-full rounded-xl border px-3 text-sm"
                />
                <button
                  type="button"
                  className="border-outline-variant h-11 shrink-0 rounded-xl border px-3 text-sm"
                  onClick={() => void loadUsers(userQuery)}
                >
                  {t("actions.search")}
                </button>
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border-outline-variant mt-2 h-11 w-full rounded-xl border px-3 text-sm"
              >
                <option value="">{tp("noUser")}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                    {user.phone ? ` · ${user.phone}` : ""}
                    {` (${user.email})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tp("phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={tp("phonePlaceholder")}
                className="border-outline-variant h-11 w-full rounded-xl border px-3 text-sm"
              />
              <p className="text-on-surface-variant mt-1 text-xs">{tp("phoneHelp")}</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tp("message")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              className="border-outline-variant w-full rounded-xl border px-3 py-2 text-sm"
              placeholder={tp("messagePlaceholder")}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !connected}
            className="bg-primary text-on-primary h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
          >
            {sending ? tp("sending") : tp("send")}
          </button>
          {!connected ? <p className="text-error text-xs">{tp("mustConnect")}</p> : null}
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-on-surface text-lg font-semibold">{tp("logTitle")}</h2>
        <DataTable
          data={messages as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage={tp("logEmpty")}
          getRowKey={(row) => String(row.id)}
          columns={[
            {
              key: "createdAt",
              header: tp("colTime"),
              render: (row) =>
                formatDate(String((row as unknown as WhatsappMessageLog).createdAt), locale),
            },
            {
              key: "toPhone",
              header: tp("colPhone"),
              render: (row) => (row as unknown as WhatsappMessageLog).toPhone,
            },
            {
              key: "body",
              header: tp("colMessage"),
              render: (row) => {
                const body = (row as unknown as WhatsappMessageLog).body;
                return body.length > 80 ? `${body.slice(0, 80)}…` : body;
              },
            },
            {
              key: "status",
              header: tp("colStatus"),
              render: (row) => {
                const s = (row as unknown as WhatsappMessageLog).status;
                return (
                  <StatusBadge
                    status={s === "SENT" ? "ACTIVE" : s === "PENDING" ? "PENDING" : "SUSPENDED"}
                  />
                );
              },
            },
          ]}
        />
      </section>
    </div>
  );
}
