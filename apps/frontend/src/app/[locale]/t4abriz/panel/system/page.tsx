"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/ui";
import {
  getAdminSystemStatus,
  updateAdminSystemSettings,
  type AdminKapitalSettings,
  type AdminGoogleOAuthSettings,
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
  const [kapitalPresets, setKapitalPresets] = useState<Record<
    KapitalEnvironment,
    KapitalPreset
  > | null>(null);
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "",
  });
  const [announcement, setAnnouncement] = useState({
    enabled: false,
    title: "",
    message: "",
  });
  const [googleOAuth, setGoogleOAuth] = useState<AdminGoogleOAuthSettings>({
    clientId: "",
    clientSecret: "",
    callbackUrl: "",
    configured: false,
    source: "env",
  });

  useEffect(() => {
    if (isAdmin) {
      getAdminSystemStatus().then((data) => {
        setStatus(data);
        setProviders(data.providers);
        setKapital(data.kapital);
        setKapitalPresets(data.kapitalPresets);
        setMaintenance(data.maintenance);
        setAnnouncement(data.announcement ?? { enabled: false, title: "", message: "" });
        setGoogleOAuth(data.googleOAuth);
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
        announcementEnabled: announcement.enabled,
        announcementTitle: announcement.title,
        announcementMessage: announcement.message,
      };

      if (providers.paymentProvider === "kapital") {
        payload.kapitalEnvironment = kapital.environment;
        payload.kapitalUsername = kapital.username.trim();
        payload.kapitalPassword = kapital.password;
      }

      payload.googleClientId = googleOAuth.clientId.trim();
      payload.googleCallbackUrl = googleOAuth.callbackUrl.trim();
      if (googleOAuth.clientSecret.trim()) {
        payload.googleClientSecret = googleOAuth.clientSecret;
      }

      const updated = await updateAdminSystemSettings(payload);
      setStatus(updated);
      setProviders(updated.providers);
      setKapital(updated.kapital);
      setKapitalPresets(updated.kapitalPresets);
      setMaintenance(updated.maintenance);
      setAnnouncement(updated.announcement ?? { enabled: false, title: "", message: "" });
      setGoogleOAuth(updated.googleOAuth);
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
        <h2 className="text-on-surface text-lg font-semibold">{tp("queue")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">
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
        <h2 className="text-on-surface text-lg font-semibold">{tp("maintenance.title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("maintenance.description")}</p>
        <div className="mt-4 space-y-4">
          <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={maintenance.enabled}
              onChange={(e) =>
                setMaintenance((current) => ({ ...current, enabled: e.target.checked }))
              }
              className="border-outline-variant h-4 w-4 rounded"
            />
            {tp("maintenance.enabled")}
          </label>
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("maintenance.message")}</span>
            <textarea
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance((current) => ({ ...current, message: e.target.value }))
              }
              rows={3}
              placeholder={tp("maintenance.messagePlaceholder")}
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 text-sm"
            />
            <span className="text-on-surface-variant text-xs">{tp("maintenance.messageHint")}</span>
          </label>
          <p className="text-on-surface-variant text-xs">{tp("maintenance.adminNote")}</p>
        </div>
      </section>

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-on-surface text-lg font-semibold">{tp("announcement.title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("announcement.description")}</p>
        <div className="mt-4 space-y-4">
          <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={announcement.enabled}
              onChange={(e) =>
                setAnnouncement((current) => ({ ...current, enabled: e.target.checked }))
              }
              className="border-outline-variant h-4 w-4 rounded"
            />
            {tp("announcement.enabled")}
          </label>
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("announcement.heading")}
            </span>
            <input
              type="text"
              value={announcement.title}
              onChange={(e) =>
                setAnnouncement((current) => ({ ...current, title: e.target.value }))
              }
              placeholder={tp("announcement.headingPlaceholder")}
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("announcement.message")}
            </span>
            <textarea
              value={announcement.message}
              onChange={(e) =>
                setAnnouncement((current) => ({ ...current, message: e.target.value }))
              }
              rows={4}
              placeholder={tp("announcement.messagePlaceholder")}
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 text-sm"
            />
            <span className="text-on-surface-variant text-xs">
              {tp("announcement.messageHint")}
            </span>
          </label>
        </div>
      </section>

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-on-surface text-lg font-semibold">{tp("googleOAuth.title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("googleOAuth.description")}</p>
        <div className="mt-4 space-y-4">
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("googleOAuth.clientId")}
            </span>
            <input
              type="text"
              value={googleOAuth.clientId}
              onChange={(e) =>
                setGoogleOAuth((current) => ({ ...current, clientId: e.target.value }))
              }
              placeholder="123456789-abc.apps.googleusercontent.com"
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 font-mono text-sm"
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("googleOAuth.clientSecret")}
            </span>
            <input
              type="password"
              value={googleOAuth.clientSecret}
              onChange={(e) =>
                setGoogleOAuth((current) => ({ ...current, clientSecret: e.target.value }))
              }
              placeholder="••••••••"
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 font-mono text-sm"
              autoComplete="new-password"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("googleOAuth.callbackUrl")}
            </span>
            <input
              type="url"
              value={googleOAuth.callbackUrl}
              onChange={(e) =>
                setGoogleOAuth((current) => ({ ...current, callbackUrl: e.target.value }))
              }
              placeholder="http://localhost:4000/api/v1/auth/google/callback"
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 font-mono text-sm"
              autoComplete="off"
            />
            <span className="text-on-surface-variant text-xs">
              {tp("googleOAuth.callbackHint")}
            </span>
          </label>

          <p className="text-on-surface-variant text-xs">
            {tp("googleOAuth.source")}: {tp(`googleOAuth.sourceOptions.${googleOAuth.source}`)}
            {googleOAuth.configured
              ? ` · ${tp("googleOAuth.configured")}`
              : ` · ${tp("googleOAuth.notConfigured")}`}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? tp("saving") : tp("save")}
          </button>
        </div>
      </section>

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-on-surface text-lg font-semibold">{tp("providers")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{status.note}</p>
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
            <div className="border-outline-variant/40 bg-surface-container-low/40 space-y-4 rounded-2xl border p-4">
              <div>
                <h3 className="text-on-surface text-base font-semibold">{tp("kapital.title")}</h3>
                <p className="text-on-surface-variant mt-1 text-sm">{tp("kapital.description")}</p>
              </div>

              <label className="block space-y-1">
                <span className="text-on-surface text-sm font-medium">
                  {tp("kapital.environment")}
                </span>
                <select
                  value={kapital.environment}
                  onChange={(e) => applyKapitalPreset(e.target.value as KapitalEnvironment)}
                  className="border-outline-variant/40 bg-surface w-full max-w-md rounded-xl border px-4 py-2.5"
                >
                  {KAPITAL_ENVIRONMENT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {tp(`kapital.environmentOptions.${key}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-on-surface text-sm font-medium">
                  {tp("kapital.username")}
                </span>
                <input
                  type="text"
                  value={kapital.username}
                  onChange={(e) =>
                    setKapital((current) => ({ ...current, username: e.target.value }))
                  }
                  placeholder={
                    kapitalPresets?.[kapital.environment]?.username ?? "TerminalSys/kapital"
                  }
                  className="border-outline-variant/40 bg-surface w-full max-w-md rounded-xl border px-4 py-2.5 font-mono text-sm"
                  autoComplete="off"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-on-surface text-sm font-medium">
                  {tp("kapital.password")}
                </span>
                <input
                  type="password"
                  value={kapital.password}
                  onChange={(e) =>
                    setKapital((current) => ({ ...current, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="border-outline-variant/40 bg-surface w-full max-w-md rounded-xl border px-4 py-2.5 font-mono text-sm"
                  autoComplete="new-password"
                />
              </label>

              <p className="text-on-surface-variant text-xs">
                {tp("kapital.baseUrl")}: <span className="font-mono">{kapital.baseUrl}</span>
              </p>
              <p className="text-on-surface-variant text-xs">
                {tp("kapital.source")}: {tp(`kapital.sourceOptions.${kapital.source}`)}
                {kapital.configured
                  ? ` · ${tp("kapital.configured")}`
                  : ` · ${tp("kapital.notConfigured")}`}
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
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
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
      <dt className="text-on-surface-variant text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-on-surface mt-1 text-lg font-semibold">{value}</dd>
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
      <span className="text-on-surface text-sm font-medium">
        {label}{" "}
        <span className="text-on-surface-variant">
          ({envDefaultLabel}: {envDefault})
        </span>
      </span>
      <select
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        className="border-outline-variant/40 bg-surface w-full max-w-md rounded-xl border px-4 py-2.5"
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
