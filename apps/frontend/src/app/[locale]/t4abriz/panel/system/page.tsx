"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/ui";
import {
  getAdminSystemStatus,
  updateAdminSystemSettings,
  type AdminKapitalSettings,
  type AdminSystemStatus,
  type KapitalEnvironment,
  type KapitalPreset,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

const PROVIDER_OPTION_KEYS = ["mock", "real", "stripe", "whm"] as const;
const PAYMENT_PROVIDER_OPTION_KEYS = ["mock", "kapital"] as const;
const KAPITAL_ENVIRONMENT_KEYS = ["test", "production"] as const;

export default function AdminSystemPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.system");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState({
    registrarProvider: "mock",
    paymentProvider: "mock",
    hostingProvider: "mock",
    proxmoxProvider: "mock",
  });
  const [kapital, setKapital] = useState<AdminKapitalSettings>({
    environment: "test",
    username: "",
    password: "",
    baseUrl: "",
    configured: false,
    source: "preset",
  });
  const [kapitalPresets, setKapitalPresets] = useState<
    Record<KapitalEnvironment, KapitalPreset> | null
  >(null);
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "",
  });

  useEffect(() => {
    if (isAdmin) {
      getAdminSystemStatus().then((data) => {
        setStatus(data);
        setProviders(data.providers);
        setKapital(data.kapital);
        setKapitalPresets(data.kapitalPresets);
        setMaintenance(data.maintenance);
      });
    }
  }, [isAdmin]);

  const applyKapitalPreset = (environment: KapitalEnvironment) => {
    if (!kapitalPresets) return;
    const preset = kapitalPresets[environment];
    setKapital((current) => ({
      ...current,
      environment,
      username: preset.username,
      password: preset.password,
      baseUrl: preset.baseUrl,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Parameters<typeof updateAdminSystemSettings>[0] = {
        ...providers,
        maintenanceEnabled: maintenance.enabled,
        maintenanceMessage: maintenance.message,
      };

      if (providers.paymentProvider === "kapital") {
        payload.kapitalEnvironment = kapital.environment;
        payload.kapitalUsername = kapital.username.trim();
        payload.kapitalPassword = kapital.password;
      }

      const updated = await updateAdminSystemSettings(payload);
      setStatus(updated);
      setProviders(updated.providers);
      setKapital(updated.kapital);
      setKapitalPresets(updated.kapitalPresets);
      setMaintenance(updated.maintenance);
      toast(tp("saved"), "success");
    } catch {
      toast(tp("saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <p className="text-on-surface-variant">{tp("adminOnly")}</p>;
  if (!status) return <p className="text-on-surface-variant">{tu("loading")}</p>;

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

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-on-surface">{tp("queue")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {tp("environment")}: {status.nodeEnv}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label={tp("connected")} value={status.queue.connected ? "Yes" : "No"} />
          <Stat label={tp("waiting")} value={String(status.queue.waiting)} />
          <Stat label={tp("active")} value={String(status.queue.active)} />
          <Stat label={tp("completed")} value={String(status.queue.completed)} />
          <Stat label={tp("failed")} value={String(status.queue.failed)} />
        </dl>
      </section>

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-on-surface">{tp("maintenance.title")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{tp("maintenance.description")}</p>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 text-sm font-medium text-on-surface">
            <input
              type="checkbox"
              checked={maintenance.enabled}
              onChange={(e) =>
                setMaintenance((current) => ({ ...current, enabled: e.target.checked }))
              }
              className="h-4 w-4 rounded border-outline-variant"
            />
            {tp("maintenance.enabled")}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-on-surface">{tp("maintenance.message")}</span>
            <textarea
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance((current) => ({ ...current, message: e.target.value }))
              }
              rows={3}
              placeholder={tp("maintenance.messagePlaceholder")}
              className="w-full max-w-xl rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm"
            />
            <span className="text-xs text-on-surface-variant">{tp("maintenance.messageHint")}</span>
          </label>
          <p className="text-xs text-on-surface-variant">{tp("maintenance.adminNote")}</p>
        </div>
      </section>

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-on-surface">{tp("providers")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{status.note}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await handleSave();
          }}
        >
          <ProviderSelect
            label={tp("labels.registrar")}
            value={providers.registrarProvider}
            envDefault={status.envDefaults.registrarProvider}
            envDefaultLabel={tp("envDefault")}
            options={PROVIDER_OPTION_KEYS}
            optionLabel={(key) => tp(`providerOptions.${key}`)}
            onChange={(v) => setProviders((p) => ({ ...p, registrarProvider: v }))}
          />
          <ProviderSelect
            label={tp("labels.payments")}
            value={providers.paymentProvider}
            envDefault={status.envDefaults.paymentProvider}
            envDefaultLabel={tp("envDefault")}
            options={PAYMENT_PROVIDER_OPTION_KEYS}
            optionLabel={(key) => tp(`providerOptions.${key}`)}
            onChange={(v) => {
              setProviders((p) => ({ ...p, paymentProvider: v }));
              if (v === "kapital" && kapitalPresets) {
                applyKapitalPreset(kapital.environment);
              }
            }}
          />

          {providers.paymentProvider === "kapital" && (
            <div className="space-y-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low/40 p-4">
              <div>
                <h3 className="text-base font-semibold text-on-surface">{tp("kapital.title")}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{tp("kapital.description")}</p>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-on-surface">{tp("kapital.environment")}</span>
                <select
                  value={kapital.environment}
                  onChange={(e) => applyKapitalPreset(e.target.value as KapitalEnvironment)}
                  className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5"
                >
                  {KAPITAL_ENVIRONMENT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {tp(`kapital.environmentOptions.${key}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-on-surface">{tp("kapital.username")}</span>
                <input
                  type="text"
                  value={kapital.username}
                  onChange={(e) => setKapital((current) => ({ ...current, username: e.target.value }))}
                  placeholder={kapitalPresets?.[kapital.environment]?.username ?? "TerminalSys/kapital"}
                  className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 font-mono text-sm"
                  autoComplete="off"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-on-surface">{tp("kapital.password")}</span>
                <input
                  type="password"
                  value={kapital.password}
                  onChange={(e) => setKapital((current) => ({ ...current, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 font-mono text-sm"
                  autoComplete="new-password"
                />
              </label>

              <p className="text-xs text-on-surface-variant">
                {tp("kapital.baseUrl")}: <span className="font-mono">{kapital.baseUrl}</span>
              </p>
              <p className="text-xs text-on-surface-variant">
                {tp("kapital.source")}: {tp(`kapital.sourceOptions.${kapital.source}`)}
                {kapital.configured ? ` · ${tp("kapital.configured")}` : ` · ${tp("kapital.notConfigured")}`}
              </p>
            </div>
          )}

          <ProviderSelect
            label={tp("labels.hosting")}
            value={providers.hostingProvider}
            envDefault={status.envDefaults.hostingProvider}
            envDefaultLabel={tp("envDefault")}
            options={PROVIDER_OPTION_KEYS}
            optionLabel={(key) => tp(`providerOptions.${key}`)}
            onChange={(v) => setProviders((p) => ({ ...p, hostingProvider: v }))}
          />
          <ProviderSelect
            label={tp("labels.proxmox")}
            value={providers.proxmoxProvider}
            envDefault={status.envDefaults.proxmoxProvider}
            envDefaultLabel={tp("envDefault")}
            options={PROVIDER_OPTION_KEYS}
            optionLabel={(key) => tp(`providerOptions.${key}`)}
            onChange={(v) => setProviders((p) => ({ ...p, proxmoxProvider: v }))}
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {saving ? tp("saving") : tp("save")}
          </button>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-3d stat-3d rounded-xl px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-on-surface">{value}</dd>
    </div>
  );
}

function ProviderSelect({
  label,
  value,
  envDefault,
  envDefaultLabel,
  options,
  optionLabel,
  onChange,
}: {
  label: string;
  value: string;
  envDefault: string;
  envDefaultLabel: string;
  options: readonly string[];
  optionLabel: (key: string) => string;
  onChange: (value: string) => void;
}) {
  const selectValue = options.includes(value) ? value : options[0];
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-on-surface">
        {label}{" "}
        <span className="text-on-surface-variant">
          ({envDefaultLabel}: {envDefault})
        </span>
      </span>
      <select
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5"
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {optionLabel(key)}
          </option>
        ))}
      </select>
    </label>
  );
}
