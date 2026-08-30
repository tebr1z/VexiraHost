"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LocaleMessageFields } from "@/components/admin/locale-message-fields";
import { PageHeader } from "@/components/ui";
import {
  getAdminSystemStatus,
  updateAdminSystemSettings,
  type AdminKapitalSettings,
  type AdminGoogleOAuthSettings,
  type AdminTurnstileSettings,
  type AdminSystemStatus,
  type KapitalEnvironment,
  type KapitalPreset,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { emptyLocalizedText } from "@/lib/localized-text";
import { defaultSiteAccess, SITE_SECTION_GROUPS, type SiteAccessConfig } from "@/lib/site-access";
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
    message: emptyLocalizedText(),
  });
  const [announcement, setAnnouncement] = useState({
    enabled: false,
    title: emptyLocalizedText(),
    message: emptyLocalizedText(),
  });
  const [access, setAccess] = useState<SiteAccessConfig>(defaultSiteAccess());
  const [googleOAuth, setGoogleOAuth] = useState<AdminGoogleOAuthSettings>({
    clientId: "",
    clientSecret: "",
    callbackUrl: "",
    configured: false,
    source: "env",
  });
  const [turnstile, setTurnstile] = useState<AdminTurnstileSettings>({
    enabled: false,
    siteKey: "0x4AAAAAAEWxQmtfjmxvrm1J",
    secretConfigured: false,
    hostnames: "",
    source: "default",
  });
  const [turnstileSecret, setTurnstileSecret] = useState("");
  const [ticketAutoCloseHours, setTicketAutoCloseHours] = useState(12);

  useEffect(() => {
    if (isAdmin) {
      getAdminSystemStatus().then((data) => {
        setStatus(data);
        setProviders(data.providers);
        setKapital(data.kapital);
        setKapitalPresets(data.kapitalPresets);
        setMaintenance(data.maintenance);
        setAnnouncement(
          data.announcement ?? {
            enabled: false,
            title: emptyLocalizedText(),
            message: emptyLocalizedText(),
          },
        );
        setAccess(data.access ?? defaultSiteAccess());
        setGoogleOAuth(data.googleOAuth);
        setTurnstile(
          data.turnstile ?? {
            enabled: false,
            siteKey: "0x4AAAAAAEWxQmtfjmxvrm1J",
            secretConfigured: false,
            hostnames: "",
            source: "default",
          },
        );
        setTicketAutoCloseHours(data.ticketAutoCloseHours ?? 12);
        setTurnstileSecret("");
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
        loginEnabled: access.loginEnabled,
        registerEnabled: access.registerEnabled,
        loginMessage: access.loginMessage,
        registerMessage: access.registerMessage,
        sectionBlocks: access.sections,
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

      payload.turnstileEnabled = turnstile.enabled;
      payload.turnstileSiteKey = turnstile.siteKey.trim();
      payload.turnstileHostnames = turnstile.hostnames.trim();
      if (turnstileSecret.trim()) {
        payload.turnstileSecret = turnstileSecret.trim();
      }
      payload.ticketAutoCloseHours = ticketAutoCloseHours;

      const updated = await updateAdminSystemSettings(payload);
      setStatus(updated);
      setProviders(updated.providers);
      setKapital(updated.kapital);
      setKapitalPresets(updated.kapitalPresets);
      setMaintenance(updated.maintenance);
      setAnnouncement(
        updated.announcement ?? {
          enabled: false,
          title: emptyLocalizedText(),
          message: emptyLocalizedText(),
        },
      );
      setAccess(updated.access ?? defaultSiteAccess());
      setGoogleOAuth(updated.googleOAuth);
      setTurnstile(
        updated.turnstile ?? {
          enabled: false,
          siteKey: "0x4AAAAAAEWxQmtfjmxvrm1J",
          secretConfigured: false,
          hostnames: "",
          source: "default",
        },
      );
      setTicketAutoCloseHours(updated.ticketAutoCloseHours ?? 12);
      setTurnstileSecret("");
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
            <LocaleMessageFields
              value={maintenance.message}
              onChange={(message) => setMaintenance((current) => ({ ...current, message }))}
              placeholder={tp("maintenance.messagePlaceholder")}
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
            <LocaleMessageFields
              value={announcement.title}
              onChange={(title) => setAnnouncement((current) => ({ ...current, title }))}
              placeholder={tp("announcement.headingPlaceholder")}
              singleLine
            />
          </label>
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("announcement.message")}
            </span>
            <LocaleMessageFields
              value={announcement.message}
              onChange={(message) => setAnnouncement((current) => ({ ...current, message }))}
              rows={4}
              placeholder={tp("announcement.messagePlaceholder")}
            />
            <span className="text-on-surface-variant text-xs">
              {tp("announcement.messageHint")}
            </span>
          </label>
        </div>
      </section>

      <section className="card-3d rounded-2xl p-6">
        <h2 className="text-on-surface text-lg font-semibold">{tp("access.title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("access.description")}</p>
        <div className="mt-4 space-y-5">
          <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={!access.loginEnabled}
              onChange={(e) =>
                setAccess((current) => ({ ...current, loginEnabled: !e.target.checked }))
              }
              className="border-outline-variant h-4 w-4 rounded"
            />
            {tp("access.closeLogin")}
          </label>
          <div className="space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("access.loginMessage")}</span>
            <LocaleMessageFields
              value={access.loginMessage}
              onChange={(loginMessage) => setAccess((current) => ({ ...current, loginMessage }))}
              placeholder={tp("access.messagePlaceholder")}
            />
          </div>
          <p className="text-on-surface-variant text-xs">{tp("access.loginStaffNote")}</p>

          <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={!access.registerEnabled}
              onChange={(e) =>
                setAccess((current) => ({ ...current, registerEnabled: !e.target.checked }))
              }
              className="border-outline-variant h-4 w-4 rounded"
            />
            {tp("access.closeRegister")}
          </label>
          <div className="space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("access.registerMessage")}
            </span>
            <LocaleMessageFields
              value={access.registerMessage}
              onChange={(registerMessage) =>
                setAccess((current) => ({ ...current, registerMessage }))
              }
              placeholder={tp("access.messagePlaceholder")}
            />
          </div>

          <div className="border-outline-variant/40 space-y-5 border-t pt-4">
            <div>
              <h3 className="text-on-surface text-sm font-semibold">
                {tp("access.sectionsTitle")}
              </h3>
              <p className="text-on-surface-variant mt-1 text-xs">{tp("access.sectionsHint")}</p>
            </div>
            {SITE_SECTION_GROUPS.map((group) => (
              <div key={group.key} className="space-y-2">
                <h4 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                  {tp(`access.groups.${group.key}`)}
                </h4>
                {group.items.map((section) => {
                  const blocked = access.sections[section].blocked;
                  return (
                    <div key={section} className="bg-surface-container-low/40 rounded-xl p-3">
                      <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={blocked}
                          onChange={(e) =>
                            setAccess((current) => ({
                              ...current,
                              sections: {
                                ...current.sections,
                                [section]: {
                                  ...current.sections[section],
                                  blocked: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="border-outline-variant h-4 w-4 rounded"
                        />
                        {tp(`access.sections.${section}`)}
                      </label>
                      {blocked ? (
                        <div className="mt-3">
                          <LocaleMessageFields
                            value={access.sections[section].message}
                            onChange={(message) =>
                              setAccess((current) => ({
                                ...current,
                                sections: {
                                  ...current.sections,
                                  [section]: { ...current.sections[section], message },
                                },
                              }))
                            }
                            placeholder={tp("access.messagePlaceholder")}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
        <h2 className="text-on-surface text-lg font-semibold">{tp("turnstile.title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("turnstile.description")}</p>
        <div className="mt-4 space-y-4">
          <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={turnstile.enabled}
              onChange={(e) =>
                setTurnstile((current) => ({ ...current, enabled: e.target.checked }))
              }
              className="border-outline-variant h-4 w-4 rounded"
            />
            {tp("turnstile.enabled")}
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("turnstile.siteKey")}</span>
            <input
              type="text"
              value={turnstile.siteKey}
              onChange={(e) => setTurnstile((current) => ({ ...current, siteKey: e.target.value }))}
              placeholder="0x4AAAAAAEWxQmtfjmxvrm1J"
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 font-mono text-sm"
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("turnstile.secret")}</span>
            <input
              type="password"
              value={turnstileSecret}
              onChange={(e) => setTurnstileSecret(e.target.value)}
              placeholder={
                turnstile.secretConfigured
                  ? tp("turnstile.secretKeepPlaceholder")
                  : tp("turnstile.secretPlaceholder")
              }
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 font-mono text-sm"
              autoComplete="new-password"
            />
            <span className="text-on-surface-variant text-xs">{tp("turnstile.secretHint")}</span>
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("turnstile.hostnames")}</span>
            <input
              type="text"
              value={turnstile.hostnames}
              onChange={(e) =>
                setTurnstile((current) => ({ ...current, hostnames: e.target.value }))
              }
              placeholder="vexirahost.com,www.vexirahost.com"
              className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 font-mono text-sm"
              autoComplete="off"
            />
            <span className="text-on-surface-variant text-xs">{tp("turnstile.hostnamesHint")}</span>
          </label>

          <p className="text-on-surface-variant text-xs">
            {tp("turnstile.source")}: {tp(`turnstile.sourceOptions.${turnstile.source}`)}
            {turnstile.secretConfigured
              ? ` · ${tp("turnstile.configured")}`
              : ` · ${tp("turnstile.notConfigured")}`}
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
        <h2 className="text-on-surface text-lg font-semibold">{tp("tickets.title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("tickets.description")}</p>
        <div className="mt-4 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-on-surface text-sm font-medium">
              {tp("tickets.autoCloseHours")}
            </span>
            <input
              type="number"
              min={1}
              max={720}
              value={ticketAutoCloseHours}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(next)) {
                  setTicketAutoCloseHours(12);
                  return;
                }
                setTicketAutoCloseHours(Math.min(720, Math.max(1, next)));
              }}
              className="border-outline-variant bg-surface h-11 w-full max-w-xs rounded-xl border px-4 text-sm"
            />
            <span className="text-on-surface-variant text-xs">
              {tp("tickets.autoCloseHoursHint")}
            </span>
          </label>
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
