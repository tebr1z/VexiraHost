"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LocaleMessageFields } from "@/components/admin/locale-message-fields";
import { MaterialIcon } from "@/components/landing/material-icon";
import { PageHeader } from "@/components/ui";
import {
  getAdminSystemStatus,
  updateAdminSystemSettings,
  type AdminKapitalSettings,
  type AdminGoogleOAuthSettings,
  type AdminGitHubOAuthSettings,
  type AdminTurnstileSettings,
  type AdminSystemStatus,
  type KapitalEnvironment,
  type KapitalPreset,
} from "@/features/admin";
import { cn } from "@/lib/cn";
import { emptyLocalizedText } from "@/lib/localized-text";
import { defaultSiteAccess, SITE_SECTION_GROUPS, type SiteAccessConfig } from "@/lib/site-access";
import { toast } from "@/stores/toast-store";

const PROVIDER_OPTION_KEYS = ["mock", "real", "stripe", "whm"] as const;
const PAYMENT_PROVIDER_OPTION_KEYS = ["mock", "kapital"] as const;
const KAPITAL_ENVIRONMENT_KEYS = ["test", "production"] as const;

type SystemTab = "status" | "site" | "integrations" | "providers";

const DEFAULT_GITHUB_OAUTH: AdminGitHubOAuthSettings = {
  clientId: "",
  callbackUrl: "",
  deployCallbackUrl: "",
  secretConfigured: false,
  configured: false,
  source: "env",
};

export function AdminSystemSettings({ isAdmin }: { isAdmin: boolean }): React.ReactElement {
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.system");
  const tu = useTranslations("ui");
  const [activeTab, setActiveTab] = useState<SystemTab>("integrations");
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
  const [githubOAuth, setGithubOAuth] = useState<AdminGitHubOAuthSettings>(DEFAULT_GITHUB_OAUTH);
  const [githubClientSecret, setGithubClientSecret] = useState("");
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
    if (!isAdmin) return;
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
      setGithubOAuth(data.githubOAuth ?? DEFAULT_GITHUB_OAUTH);
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
      setGithubClientSecret("");
    });
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
        googleClientId: googleOAuth.clientId.trim(),
        googleCallbackUrl: googleOAuth.callbackUrl.trim(),
        githubClientId: githubOAuth.clientId.trim(),
        githubCallbackUrl: githubOAuth.callbackUrl.trim(),
        githubDeployCallbackUrl: githubOAuth.deployCallbackUrl.trim(),
        turnstileEnabled: turnstile.enabled,
        turnstileSiteKey: turnstile.siteKey.trim(),
        turnstileHostnames: turnstile.hostnames.trim(),
        ticketAutoCloseHours,
      };

      if (providers.paymentProvider === "kapital") {
        payload.kapitalEnvironment = kapital.environment;
        payload.kapitalUsername = kapital.username.trim();
        payload.kapitalPassword = kapital.password;
      }
      if (googleOAuth.clientSecret.trim()) {
        payload.googleClientSecret = googleOAuth.clientSecret;
      }
      if (githubClientSecret.trim()) {
        payload.githubClientSecret = githubClientSecret.trim();
      }
      if (turnstileSecret.trim()) {
        payload.turnstileSecret = turnstileSecret.trim();
      }

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
      setGithubOAuth(updated.githubOAuth ?? DEFAULT_GITHUB_OAUTH);
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
      setGithubClientSecret("");
      toast(tp("saved"), "success");
    } catch {
      toast(tp("saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <p className="text-on-surface-variant">{tp("adminOnly")}</p>;
  if (!status) return <p className="text-on-surface-variant">{tu("loading")}</p>;

  const tabs: { id: SystemTab; label: string; icon: string }[] = [
    { id: "integrations", label: tp("tabIntegrations"), icon: "hub" },
    { id: "site", label: tp("tabSite"), icon: "public" },
    { id: "providers", label: tp("tabProviders"), icon: "settings_ethernet" },
    { id: "status", label: tp("tabStatus"), icon: "monitoring" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
        actions={
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="bg-primary text-on-primary inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
          >
            <MaterialIcon name="save" className="text-[18px]" />
            {saving ? tp("saving") : tp("save")}
          </button>
        }
      />

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-4",
              activeTab === tab.id
                ? "bg-[var(--bg-elevated)] text-[var(--label-primary)] shadow-sm"
                : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]",
            )}
          >
            <MaterialIcon name={tab.icon} className="text-[18px]" />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === "status" ? (
        <SettingsCard title={tp("queue")} description={`${tp("environment")}: ${status.nodeEnv}`}>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label={tp("connected")} value={status.queue.connected ? "Yes" : "No"} />
            <Stat label={tp("waiting")} value={String(status.queue.waiting)} />
            <Stat label={tp("active")} value={String(status.queue.active)} />
            <Stat label={tp("completed")} value={String(status.queue.completed)} />
            <Stat label={tp("failed")} value={String(status.queue.failed)} />
          </dl>
        </SettingsCard>
      ) : null}

      {activeTab === "integrations" ? (
        <div className="space-y-5">
          <SettingsCard
            title={tp("githubOAuth.title")}
            description={tp("githubOAuth.description")}
            icon="code"
            badge={
              <ConfigBadge
                configured={githubOAuth.configured}
                label={
                  githubOAuth.configured
                    ? tp("githubOAuth.configured")
                    : tp("githubOAuth.notConfigured")
                }
              />
            }
            className="border-[color-mix(in_srgb,var(--accent)_28%,var(--separator))]"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label={tp("githubOAuth.clientId")}>
                <MonoInput
                  value={githubOAuth.clientId}
                  onChange={(clientId) => setGithubOAuth((c) => ({ ...c, clientId }))}
                  placeholder="Iv1.xxxxxxxxxxxx"
                />
              </Field>
              <Field label={tp("githubOAuth.clientSecret")}>
                <MonoInput
                  type="password"
                  value={githubClientSecret}
                  onChange={setGithubClientSecret}
                  placeholder={
                    githubOAuth.secretConfigured
                      ? tp("githubOAuth.secretKeepPlaceholder")
                      : tp("githubOAuth.secretPlaceholder")
                  }
                />
                <Hint>{tp("githubOAuth.secretHint")}</Hint>
              </Field>
              <Field label={tp("githubOAuth.callbackUrl")} className="lg:col-span-2">
                <MonoInput
                  value={githubOAuth.callbackUrl}
                  onChange={(callbackUrl) => setGithubOAuth((c) => ({ ...c, callbackUrl }))}
                  placeholder="https://api.yoursite.com/api/v1/auth/github/callback"
                />
                <Hint>{tp("githubOAuth.callbackHint")}</Hint>
              </Field>
              <Field label={tp("githubOAuth.deployCallbackUrl")} className="lg:col-span-2">
                <MonoInput
                  value={githubOAuth.deployCallbackUrl}
                  onChange={(deployCallbackUrl) =>
                    setGithubOAuth((c) => ({ ...c, deployCallbackUrl }))
                  }
                  placeholder="https://api.yoursite.com/api/v1/deploy/github/oauth/callback"
                />
                <Hint>{tp("githubOAuth.deployCallbackHint")}</Hint>
              </Field>
            </div>
            <SourceLine
              source={tp(`githubOAuth.sourceOptions.${githubOAuth.source}`)}
              label={tp("githubOAuth.source")}
            />
          </SettingsCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsCard
              title={tp("googleOAuth.title")}
              description={tp("googleOAuth.description")}
              icon="account_circle"
              badge={
                <ConfigBadge
                  configured={googleOAuth.configured}
                  label={
                    googleOAuth.configured
                      ? tp("googleOAuth.configured")
                      : tp("googleOAuth.notConfigured")
                  }
                />
              }
            >
              <div className="space-y-4">
                <Field label={tp("googleOAuth.clientId")}>
                  <MonoInput
                    value={googleOAuth.clientId}
                    onChange={(clientId) => setGoogleOAuth((c) => ({ ...c, clientId }))}
                    placeholder="123456789-abc.apps.googleusercontent.com"
                  />
                </Field>
                <Field label={tp("googleOAuth.clientSecret")}>
                  <MonoInput
                    type="password"
                    value={googleOAuth.clientSecret}
                    onChange={(clientSecret) => setGoogleOAuth((c) => ({ ...c, clientSecret }))}
                    placeholder="••••••••"
                  />
                </Field>
                <Field label={tp("googleOAuth.callbackUrl")}>
                  <MonoInput
                    value={googleOAuth.callbackUrl}
                    onChange={(callbackUrl) => setGoogleOAuth((c) => ({ ...c, callbackUrl }))}
                    placeholder="https://api.yoursite.com/api/v1/auth/google/callback"
                  />
                  <Hint>{tp("googleOAuth.callbackHint")}</Hint>
                </Field>
                <SourceLine
                  source={tp(`googleOAuth.sourceOptions.${googleOAuth.source}`)}
                  label={tp("googleOAuth.source")}
                />
              </div>
            </SettingsCard>

            <SettingsCard
              title={tp("turnstile.title")}
              description={tp("turnstile.description")}
              icon="shield"
              badge={
                <ConfigBadge
                  configured={turnstile.secretConfigured}
                  label={
                    turnstile.secretConfigured
                      ? tp("turnstile.configured")
                      : tp("turnstile.notConfigured")
                  }
                />
              }
            >
              <div className="space-y-4">
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
                <Field label={tp("turnstile.siteKey")}>
                  <MonoInput
                    value={turnstile.siteKey}
                    onChange={(siteKey) => setTurnstile((c) => ({ ...c, siteKey }))}
                  />
                </Field>
                <Field label={tp("turnstile.secret")}>
                  <MonoInput
                    type="password"
                    value={turnstileSecret}
                    onChange={setTurnstileSecret}
                    placeholder={
                      turnstile.secretConfigured
                        ? tp("turnstile.secretKeepPlaceholder")
                        : tp("turnstile.secretPlaceholder")
                    }
                  />
                  <Hint>{tp("turnstile.secretHint")}</Hint>
                </Field>
                <Field label={tp("turnstile.hostnames")}>
                  <MonoInput
                    value={turnstile.hostnames}
                    onChange={(hostnames) => setTurnstile((c) => ({ ...c, hostnames }))}
                    placeholder="vexirahost.com,www.vexirahost.com"
                  />
                  <Hint>{tp("turnstile.hostnamesHint")}</Hint>
                </Field>
              </div>
            </SettingsCard>
          </div>
        </div>
      ) : null}

      {activeTab === "site" ? (
        <div className="space-y-5">
          <SettingsCard title={tp("maintenance.title")} description={tp("maintenance.description")}>
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
            <Field label={tp("maintenance.message")} className="mt-4">
              <LocaleMessageFields
                value={maintenance.message}
                onChange={(message) => setMaintenance((current) => ({ ...current, message }))}
                placeholder={tp("maintenance.messagePlaceholder")}
              />
              <Hint>{tp("maintenance.messageHint")}</Hint>
            </Field>
          </SettingsCard>

          <SettingsCard
            title={tp("announcement.title")}
            description={tp("announcement.description")}
          >
            <div className="space-y-4">
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
              <Field label={tp("announcement.heading")}>
                <LocaleMessageFields
                  value={announcement.title}
                  onChange={(title) => setAnnouncement((current) => ({ ...current, title }))}
                  placeholder={tp("announcement.headingPlaceholder")}
                  singleLine
                />
              </Field>
              <Field label={tp("announcement.message")}>
                <LocaleMessageFields
                  value={announcement.message}
                  onChange={(message) => setAnnouncement((current) => ({ ...current, message }))}
                  rows={4}
                  placeholder={tp("announcement.messagePlaceholder")}
                />
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard title={tp("access.title")} description={tp("access.description")}>
            <div className="space-y-4">
              <ToggleRow
                checked={!access.loginEnabled}
                onChange={(v) => setAccess((c) => ({ ...c, loginEnabled: !v }))}
                label={tp("access.closeLogin")}
              />
              <Field label={tp("access.loginMessage")}>
                <LocaleMessageFields
                  value={access.loginMessage}
                  onChange={(loginMessage) => setAccess((c) => ({ ...c, loginMessage }))}
                  placeholder={tp("access.messagePlaceholder")}
                />
              </Field>
              <ToggleRow
                checked={!access.registerEnabled}
                onChange={(v) => setAccess((c) => ({ ...c, registerEnabled: !v }))}
                label={tp("access.closeRegister")}
              />
              <Field label={tp("access.registerMessage")}>
                <LocaleMessageFields
                  value={access.registerMessage}
                  onChange={(registerMessage) => setAccess((c) => ({ ...c, registerMessage }))}
                  placeholder={tp("access.messagePlaceholder")}
                />
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard title={tp("tickets.title")} description={tp("tickets.description")}>
            <Field label={tp("tickets.autoCloseHours")}>
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
              <Hint>{tp("tickets.autoCloseHoursHint")}</Hint>
            </Field>
          </SettingsCard>

          <details className="card-3d rounded-2xl p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--label-primary)]">
              {tp("access.sectionsTitle")}
            </summary>
            <p className="text-on-surface-variant mt-2 text-xs">{tp("access.sectionsHint")}</p>
            <div className="mt-4 space-y-4">
              {SITE_SECTION_GROUPS.map((group) => (
                <div key={group.key} className="space-y-2">
                  <h4 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                    {tp(`access.groups.${group.key}`)}
                  </h4>
                  {group.items.map((section) => {
                    const blocked = access.sections[section].blocked;
                    return (
                      <div key={section} className="bg-surface-container-low/40 rounded-xl p-3">
                        <ToggleRow
                          checked={blocked}
                          onChange={(v) =>
                            setAccess((current) => ({
                              ...current,
                              sections: {
                                ...current.sections,
                                [section]: { ...current.sections[section], blocked: v },
                              },
                            }))
                          }
                          label={tp(`access.sections.${section}`)}
                        />
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
          </details>
        </div>
      ) : null}

      {activeTab === "providers" ? (
        <SettingsCard title={tp("providers")} description={status.note}>
          <div className="space-y-4">
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
            {providers.paymentProvider === "kapital" ? (
              <div className="border-outline-variant/40 bg-surface-container-low/40 space-y-4 rounded-2xl border p-4">
                <div>
                  <h3 className="text-on-surface text-base font-semibold">{tp("kapital.title")}</h3>
                  <p className="text-on-surface-variant mt-1 text-sm">
                    {tp("kapital.description")}
                  </p>
                </div>
                <Field label={tp("kapital.environment")}>
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
                </Field>
                <Field label={tp("kapital.username")}>
                  <MonoInput
                    value={kapital.username}
                    onChange={(username) => setKapital((c) => ({ ...c, username }))}
                  />
                </Field>
                <Field label={tp("kapital.password")}>
                  <MonoInput
                    type="password"
                    value={kapital.password}
                    onChange={(password) => setKapital((c) => ({ ...c, password }))}
                  />
                </Field>
                <SourceLine
                  source={tp(`kapital.sourceOptions.${kapital.source}`)}
                  label={tp("kapital.source")}
                />
              </div>
            ) : null}
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
          </div>
        </SettingsCard>
      ) : null}
    </div>
  );
}

function SettingsCard({
  title,
  description,
  icon,
  badge,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: string;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card-3d rounded-2xl p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
              <MaterialIcon name={icon} className="text-[20px]" />
            </span>
          ) : null}
          <div>
            <h2 className="text-on-surface text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="text-on-surface-variant mt-1 max-w-3xl text-sm">{description}</p>
            ) : null}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function ConfigBadge({ configured, label }: { configured: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        configured ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
      )}
    >
      {label}
    </span>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-on-surface text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-on-surface-variant text-xs">{children}</span>;
}

function SourceLine({ label, source }: { label: string; source: string }) {
  return (
    <p className="text-on-surface-variant mt-4 text-xs">
      {label}: {source}
    </p>
  );
}

function MonoInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "url";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
      autoComplete={type === "password" ? "new-password" : "off"}
    />
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="text-on-surface flex items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="border-outline-variant h-4 w-4 rounded"
      />
      {label}
    </label>
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
    <Field label={`${label} (${envDefaultLabel}: ${envDefault})`}>
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
    </Field>
  );
}
