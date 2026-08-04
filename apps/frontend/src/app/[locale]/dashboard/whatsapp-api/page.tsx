"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  createWhatsappApiKey,
  getWhatsappApiDashboard,
  testWhatsappApiMessage,
  updateWhatsappApiKeyStatus,
  type CreatedWhatsappApiKey,
  type WhatsappApiDashboard,
  type WhatsappApiKeySummary,
} from "@/features/whatsapp-api/services/whatsapp-api.service";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

export default function WhatsappApiPage(): React.ReactElement {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.whatsappApi");
  const [dashboard, setDashboard] = useState<WhatsappApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState("Production");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedWhatsappApiKey | null>(null);
  const [testKey, setTestKey] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setDashboard(await getWhatsappApiDashboard());
    } catch (error) {
      toast(getApiErrorMessage(error, tp("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [tp]);

  useEffect(() => {
    void load();
  }, [load]);

  const endpoint = dashboard?.endpoint ?? "http://localhost:4000/api/v1/whatsapp/messages";
  const curlExample = useMemo(
    () =>
      `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: vxwa_live_your_key" \\\n  -d '{"phone":"+994501234567","message":"Hello from Vexira"}'`,
    [endpoint],
  );

  const createKey = async () => {
    setCreating(true);
    try {
      const key = await createWhatsappApiKey(keyName);
      setCreatedKey(key);
      setTestKey(key.key);
      await load();
      toast(tp("keyCreated"), "success");
    } catch (error) {
      toast(getApiErrorMessage(error, tp("keyCreateFailed")), "error");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast(tp("copied"), "success");
  };

  const sendTest = async () => {
    setSending(true);
    try {
      const result = await testWhatsappApiMessage({
        endpoint,
        apiKey: testKey.trim(),
        phone: phone.trim(),
        message: message.trim(),
      });
      toast(tp("testSent", { id: result.id }), "success");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : tp("testFailed"), "error");
    } finally {
      setSending(false);
    }
  };

  const setKeyStatus = async (keyId: string, isActive: boolean) => {
    try {
      await updateWhatsappApiKeyStatus(keyId, isActive);
      await load();
      toast(isActive ? tp("keyActivated") : tp("keyDeactivated"), "success");
    } catch (error) {
      toast(getApiErrorMessage(error, tp("statusFailed")), "error");
    }
  };

  if (loading) return <p className="text-on-surface-variant">{tp("loading")}</p>;

  const access = dashboard?.access;
  const activeKeys = dashboard?.keys.filter((key) => key.isActive) ?? [];
  const inactiveKeys = dashboard?.keys.filter((key) => !key.isActive) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[{ label: t("nav.dashboard"), href: "/dashboard" }, { label: tp("title") }]}
      />

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{tp("accessTitle")}</h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              {access?.isEnabled ? tp("accessEnabled") : tp("accessDisabled")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              dashboard?.gatewayConnected
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-red-500/10 text-red-700"
            }`}
          >
            {dashboard?.gatewayConnected ? tp("gatewayOnline") : tp("gatewayOffline")}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label={tp("monthlyLimit")} value={String(access?.monthlyLimit ?? 0)} />
          <Metric label={tp("used")} value={String(access?.used ?? 0)} />
          <Metric label={tp("remaining")} value={String(access?.remaining ?? 0)} />
        </div>
      </section>

      {!access?.isEnabled ? (
        <section className="rounded-2xl border border-amber-400/60 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-lg font-semibold">{tp("supportTitle")}</h2>
          <p className="mt-1 text-sm">{tp("supportHelp")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/tickets/new"
              className="rounded-xl border border-amber-700 px-4 py-2 text-sm font-semibold"
            >
              {tp("contactSupport")}
            </Link>
            <a
              href="https://wa.me/994709646466"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
            >
              {tp("contactWhatsapp")} · +994 70 964 64 66
            </a>
          </div>
        </section>
      ) : null}

      {createdKey ? (
        <section className="rounded-2xl border border-amber-400/60 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-semibold">{tp("storeKeyTitle")}</h2>
          <p className="mt-1 text-sm">{tp("storeKeyHelp")}</p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={createdKey.key}
              className="h-11 min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => void copy(createdKey.key)}
              className="rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white"
            >
              {tp("copy")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">{tp("keysTitle")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          {tp("keysHelp", { max: dashboard?.maxActiveKeys ?? 2 })}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={keyName}
            onChange={(event) => setKeyName(event.target.value)}
            maxLength={80}
            placeholder={tp("keyName")}
            className="border-outline-variant h-11 flex-1 rounded-xl border px-4 text-sm"
          />
          <button
            type="button"
            disabled={
              creating || !access?.isEnabled || activeKeys.length >= (dashboard?.maxActiveKeys ?? 2)
            }
            onClick={() => void createKey()}
            className="bg-primary text-on-primary h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? tp("creating") : tp("createKey")}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            {tp("activeKeys")} · {activeKeys.length}/{dashboard?.maxActiveKeys ?? 2}
          </p>
          {activeKeys.map((key) => (
            <CompactKeyRow
              key={key.id}
              apiKey={key}
              locale={locale}
              actionLabel={tp("deactivate")}
              onAction={() => void setKeyStatus(key.id, false)}
            />
          ))}
          {(dashboard?.keys.length ?? 0) === 0 ? (
            <p className="text-on-surface-variant text-sm">{tp("noKeys")}</p>
          ) : null}
          {inactiveKeys.length > 0 ? (
            <details className="border-outline-variant/50 rounded-xl border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                {tp("inactiveKeys")} · {inactiveKeys.length}
              </summary>
              <div className="border-outline-variant/50 space-y-1 border-t p-2">
                {inactiveKeys.map((key) => (
                  <CompactKeyRow
                    key={key.id}
                    apiKey={key}
                    locale={locale}
                    actionLabel={tp("activate")}
                    actionDisabled={activeKeys.length >= (dashboard?.maxActiveKeys ?? 2)}
                    onAction={() => void setKeyStatus(key.id, true)}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </section>

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">{tp("docsTitle")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("docsHelp")}</p>
        <div className="mt-4">
          <p className="text-on-surface-variant mb-1 text-xs font-semibold uppercase">
            POST {endpoint}
          </p>
          <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-100">
            <code>{curlExample}</code>
          </pre>
        </div>
      </section>

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">{tp("testTitle")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("testHelp")}</p>
        <div className="mt-4 grid gap-3">
          <input
            type="password"
            value={testKey}
            onChange={(event) => setTestKey(event.target.value)}
            placeholder={tp("apiKey")}
            className="border-outline-variant h-11 rounded-xl border px-4 font-mono text-sm"
          />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+994501234567"
            className="border-outline-variant h-11 rounded-xl border px-4 text-sm"
          />
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={4096}
            rows={4}
            placeholder={tp("message")}
            className="border-outline-variant rounded-xl border px-4 py-3 text-sm"
          />
          <button
            type="button"
            disabled={sending || !testKey.trim() || !phone.trim() || !message.trim()}
            onClick={() => void sendTest()}
            className="bg-primary text-on-primary h-11 w-fit rounded-xl px-6 text-sm font-semibold disabled:opacity-50"
          >
            {sending ? tp("sending") : tp("sendTest")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="border-outline-variant/50 bg-surface-container-low rounded-xl border p-4">
      <p className="text-on-surface-variant text-xs">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function CompactKeyRow({
  apiKey,
  locale,
  actionLabel,
  actionDisabled = false,
  onAction,
}: {
  apiKey: WhatsappApiKeySummary;
  locale: string;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
}): React.ReactElement {
  const tp = useTranslations("dashboard.pages.whatsappApi");
  return (
    <div className="bg-surface-container-low flex items-center justify-between gap-3 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{apiKey.name}</p>
          <code className="text-on-surface-variant truncate text-[11px]">
            {apiKey.keyPrefix}••{apiKey.lastFour}
          </code>
        </div>
        <p className="text-on-surface-variant truncate text-[11px]">
          {tp("createdAt", { date: formatDate(apiKey.createdAt, locale) })}
          {apiKey.lastUsedAt
            ? ` · ${tp("lastUsedAt", { date: formatDate(apiKey.lastUsedAt, locale) })}`
            : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={actionDisabled}
        onClick={onAction}
        className="border-outline-variant shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
      >
        {actionLabel}
      </button>
    </div>
  );
}
