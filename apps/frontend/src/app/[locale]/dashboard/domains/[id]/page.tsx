"use client";

import { ApiClientError } from "@vexira/api-sdk";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DomainDnsRecordsEditor } from "@/components/domains/domain-dns-records-editor";
import { DomainNameserverStatusCard } from "@/components/domains/domain-nameserver-status-card";
import {
  DEFAULT_NAMESERVERS,
  DomainNameserversEditor,
} from "@/components/domains/domain-nameservers-editor";
import {
  DomainNsGlueEditor,
  validateGlueEntries,
  type NsGlueEntry,
} from "@/components/domains/domain-ns-glue-editor";
import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  connectCloudflareDns,
  disconnectCloudflareDns,
  getCloudflareDnsStatus,
  getDnssecStatus,
  getDnsRecords,
  getDomain,
  getNameserverStatus,
  syncCloudflareDns,
  setDnssecEnabled,
  updateDnsRecords,
  updateNameservers,
  updateNsGlue,
  type CloudflareDnsStatus,
  type DnsRecord,
  type DnssecStatus,
  type NameserverStatus,
  type UserDomain,
} from "@/features/domains";
import { Link } from "@/i18n/navigation";

type SettingsPanel = "dns" | "nameservers" | "glue" | "cloudflare" | "dnssec";

function buildGlueFromDomain(domain: UserDomain): NsGlueEntry[] {
  if (domain.nsGlueRecords.length > 0) {
    return domain.nsGlueRecords;
  }
  return [
    { host: `ns1.${domain.name}`, ip: "" },
    { host: `ns2.${domain.name}`, ip: "" },
  ];
}

function buildNameserversFromDomain(domain: UserDomain): string[] {
  if (domain.nameservers.length >= 2) {
    return domain.nameservers;
  }
  return [...DEFAULT_NAMESERVERS];
}

export default function DomainDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.domains");
  const tu = useTranslations("ui");
  const domainId = params.id as string;
  const [domain, setDomain] = useState<UserDomain | null>(null);
  const [activePanel, setActivePanel] = useState<SettingsPanel>("dns");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [cloudflareStatus, setCloudflareStatus] = useState<CloudflareDnsStatus | null>(null);
  const [dnssecStatus, setDnssecStatus] = useState<DnssecStatus | null>(null);
  const [providerBusy, setProviderBusy] = useState(false);
  const [nameservers, setNameservers] = useState<string[]>(DEFAULT_NAMESERVERS);
  const [nameserverStatus, setNameserverStatus] = useState<NameserverStatus | null>(null);
  const [nameserverStatusLoading, setNameserverStatusLoading] = useState(true);
  const [nsGlueEntries, setNsGlueEntries] = useState<NsGlueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameserversManaged =
    domain?.dnsProvider === "POWERDNS" || domain?.dnsProvider === "CLOUDFLARE";

  useEffect(() => {
    Promise.all([getDomain(domainId), getDnsRecords(domainId)])
      .then(([domainData, records]) => {
        setDomain(domainData);
        setDnsRecords(records);
        setNameservers(buildNameserversFromDomain(domainData));
        setNsGlueEntries(buildGlueFromDomain(domainData));
      })
      .catch(() => setError(tc("dnsLoadFailed")))
      .finally(() => setLoading(false));

    getCloudflareDnsStatus(domainId)
      .then(setCloudflareStatus)
      .catch(() => setCloudflareStatus(null));

    getDnssecStatus(domainId)
      .then(setDnssecStatus)
      .catch(() => setDnssecStatus(null));

    getNameserverStatus(domainId)
      .then(setNameserverStatus)
      .catch(() => setNameserverStatus(null))
      .finally(() => setNameserverStatusLoading(false));
  }, [domainId, tc]);

  const handleNameserverStatusRefresh = async () => {
    setNameserverStatusLoading(true);
    try {
      setNameserverStatus(await getNameserverStatus(domainId));
    } finally {
      setNameserverStatusLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    if (activePanel === "dns") {
      if (dnsRecords.length === 0) {
        setError(tp("dnsAtLeastOne"));
        setSaving(false);
        return;
      }
      try {
        const records = await updateDnsRecords(domainId, dnsRecords);
        setDnsRecords(records);
        setMessage(tp("dnsSaved"));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : tp("settingsSaveFailed"));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (activePanel === "cloudflare") {
      setSaving(false);
      return;
    }

    if (activePanel === "nameservers") {
      const cleanedNs = nameservers.map((ns) => ns.trim().toLowerCase()).filter(Boolean);
      if (cleanedNs.length < 2) {
        setError(tp("nameserversMin"));
        setSaving(false);
        return;
      }
      if (new Set(cleanedNs).size !== cleanedNs.length) {
        setError(tp("nsDuplicateHost"));
        setSaving(false);
        return;
      }
      try {
        const result = await updateNameservers(domainId, cleanedNs);
        setNameservers(result.nameservers);
        setDomain((current) =>
          current ? { ...current, nameservers: result.nameservers } : current,
        );
        setMessage(tp("settingsSaved"));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : tp("settingsSaveFailed"));
      } finally {
        setSaving(false);
      }
      return;
    }

    const cleanedGlue = nsGlueEntries
      .map((entry) => ({
        host: entry.host.trim().toLowerCase(),
        ip: entry.ip.trim(),
      }))
      .filter((entry) => entry.host.length > 0);

    const cleanedNs = nameservers.map((ns) => ns.trim().toLowerCase()).filter(Boolean);

    const ipError = validateGlueEntries(cleanedGlue, tp("ipInvalidFormat"));
    if (ipError) {
      setError(ipError);
      setSaving(false);
      return;
    }

    const glueHosts = new Set<string>();
    for (const entry of cleanedGlue) {
      if (glueHosts.has(entry.host)) {
        setError(tp("nsGlueDuplicateHost"));
        setSaving(false);
        return;
      }
      glueHosts.add(entry.host);
    }

    const nsHosts = new Set<string>();
    for (const host of cleanedNs) {
      if (nsHosts.has(host)) {
        setError(tp("nsDuplicateHost"));
        setSaving(false);
        return;
      }
      nsHosts.add(host);
    }

    if (cleanedGlue.length < 2) {
      setError(tp("glueHostsMin"));
      setSaving(false);
      return;
    }

    if (cleanedNs.length < 2) {
      setError(tp("nameserversMin"));
      setSaving(false);
      return;
    }

    try {
      const result = await updateNsGlue(domainId, {
        entries: cleanedGlue,
        nameservers: cleanedNs,
      });
      setNsGlueEntries(result.nsGlueRecords);
      setNameservers(result.nameservers);
      setDomain((current) =>
        current
          ? {
              ...current,
              nameservers: result.nameservers,
              nsGlueRecords: result.nsGlueRecords,
            }
          : current,
      );
      setMessage(tp("settingsSaved"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tp("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleCloudflareConnect = async () => {
    setProviderBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await connectCloudflareDns(domainId);
      setDomain(result.domain);
      setDnsRecords(result.records);
      setNameservers(buildNameserversFromDomain(result.domain));
      setCloudflareStatus(await getCloudflareDnsStatus(domainId));
      setMessage(tp("cloudflareConnected"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tp("cloudflareFailed"));
    } finally {
      setProviderBusy(false);
    }
  };

  const handleCloudflareSync = async () => {
    setProviderBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await syncCloudflareDns(domainId);
      setDomain(result.domain);
      setDnsRecords(result.records);
      setNameservers(buildNameserversFromDomain(result.domain));
      setCloudflareStatus(await getCloudflareDnsStatus(domainId));
      setMessage(tp("cloudflareSynced"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tp("cloudflareFailed"));
    } finally {
      setProviderBusy(false);
    }
  };

  const handleCloudflareDisconnect = async () => {
    setProviderBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await disconnectCloudflareDns(domainId);
      setDomain(updated);
      setCloudflareStatus({
        configured: cloudflareStatus?.configured ?? false,
        connected: false,
        status: null,
        nameservers: [],
        lastSyncedAt: null,
      });
      setMessage(tp("cloudflareDisconnected"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tp("cloudflareFailed"));
    } finally {
      setProviderBusy(false);
    }
  };

  const handleDnssecToggle = async (enabled: boolean) => {
    setProviderBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await setDnssecEnabled(domainId, enabled);
      setDnssecStatus(result);
      setMessage(enabled ? tp("dnssecEnabledMessage") : tp("dnssecDisabledMessage"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tp("dnssecFailed"));
    } finally {
      setProviderBusy(false);
    }
  };

  const panelButtonClass = (panel: SettingsPanel) =>
    [
      "w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
      activePanel === panel
        ? "bg-primary text-on-primary shadow-sm"
        : "border border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-container-low",
    ].join(" ");

  if (loading) {
    return <LoadingSkeletonList rows={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={domain?.name ?? tp("manageTitle")}
        description={tp("simpleDescription")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.domains"), href: "/dashboard/domains" },
          { label: domain?.name ?? tp("manageTitle") },
        ]}
      />

      {domain?.status === "SUSPENDED" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {tc("suspendedTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-50/90">
            {tc("suspendedBody")}
          </p>
          <Link
            href={
              domain.renewalInvoiceId
                ? `/dashboard/invoices/${domain.renewalInvoiceId}`
                : "/dashboard/invoices"
            }
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white"
          >
            {tc("payInvoice")}
          </Link>
        </div>
      )}

      <DomainNameserverStatusCard
        status={nameserverStatus}
        loading={nameserverStatusLoading}
        onRefresh={() => void handleNameserverStatusRefresh()}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:w-56 lg:shrink-0">
          <p className="text-on-surface-variant mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
            {tp("settingsNavLabel")}
          </p>
          <nav className="flex flex-row gap-2 lg:flex-col">
            <button
              type="button"
              className={panelButtonClass("dns")}
              onClick={() => {
                setActivePanel("dns");
                setError(null);
                setMessage(null);
              }}
            >
              {tp("tabDns")}
            </button>
            <button
              type="button"
              className={panelButtonClass("nameservers")}
              onClick={() => {
                setActivePanel("nameservers");
                setError(null);
                setMessage(null);
              }}
            >
              {tp("settingsTabNs")}
            </button>
            {!nameserversManaged ? (
              <button
                type="button"
                className={panelButtonClass("glue")}
                onClick={() => {
                  setActivePanel("glue");
                  setError(null);
                  setMessage(null);
                }}
              >
                {tp("settingsTabGlue")}
              </button>
            ) : null}
            <button
              type="button"
              className={panelButtonClass("cloudflare")}
              onClick={() => {
                setActivePanel("cloudflare");
                setError(null);
                setMessage(null);
              }}
            >
              {tp("cloudflareTab")}
            </button>
            <button
              type="button"
              className={panelButtonClass("dnssec")}
              onClick={() => {
                setActivePanel("dnssec");
                setError(null);
                setMessage(null);
              }}
            >
              {tp("dnssecTab")}
            </button>
          </nav>
        </aside>

        <form className="card-3d min-w-0 flex-1 space-y-6 rounded-2xl p-6" onSubmit={handleSave}>
          {activePanel === "dns" ? (
            <DomainDnsRecordsEditor
              records={dnsRecords}
              onChange={setDnsRecords}
              disabled={saving || domain?.status !== "ACTIVE"}
            />
          ) : activePanel === "nameservers" ? (
            <DomainNameserversEditor
              nameservers={nameservers}
              onChange={setNameservers}
              translationScope="dashboard"
              disabled={nameserversManaged}
            />
          ) : activePanel === "glue" ? (
            <DomainNsGlueEditor
              entries={nsGlueEntries}
              onChange={setNsGlueEntries}
              hostSuffix={domain?.name}
              translationScope="dashboard"
              onValidationError={(msg) => {
                if (msg) setError(msg);
              }}
            />
          ) : activePanel === "cloudflare" ? (
            <div className="space-y-5">
              <div className="border-outline-variant/40 bg-surface-container-low rounded-xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-on-surface text-lg font-semibold">
                      {tp("cloudflareTitle")}
                    </h3>
                    <p className="text-on-surface-variant mt-1 max-w-2xl text-sm">
                      {tp("cloudflareDescription")}
                    </p>
                  </div>
                  <span className="border-outline-variant/40 bg-surface rounded-full border px-3 py-1 text-xs font-semibold uppercase">
                    {cloudflareStatus?.connected
                      ? cloudflareStatus.status || tp("cloudflareConnectedStatus")
                      : tp("cloudflareNotConnected")}
                  </span>
                </div>

                {!cloudflareStatus?.configured ? (
                  <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                    {tp("cloudflareNotConfigured")}
                  </p>
                ) : null}

                {cloudflareStatus?.nameservers.length ? (
                  <div className="bg-surface mt-4 rounded-lg p-3">
                    <p className="text-on-surface-variant text-xs font-semibold uppercase">
                      {tp("cloudflareNameservers")}
                    </p>
                    <p className="text-on-surface mt-1 font-mono text-sm">
                      {cloudflareStatus.nameservers.join(" · ")}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {!cloudflareStatus?.connected ? (
                    <button
                      type="button"
                      disabled={providerBusy || !cloudflareStatus?.configured}
                      onClick={() => void handleCloudflareConnect()}
                      className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {providerBusy ? tu("loading") : tp("cloudflareConnect")}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={providerBusy}
                        onClick={() => void handleCloudflareSync()}
                        className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {providerBusy ? tu("loading") : tp("cloudflareSync")}
                      </button>
                      <button
                        type="button"
                        disabled={providerBusy}
                        onClick={() => void handleCloudflareDisconnect()}
                        className="border-error/40 text-error rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {tp("cloudflareDisconnect")}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-on-surface-variant text-xs">{tp("cloudflareSecurityHint")}</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-outline-variant/40 bg-surface-container-low rounded-xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-on-surface text-lg font-semibold">{tp("dnssecTitle")}</h3>
                    <p className="text-on-surface-variant mt-1 max-w-2xl text-sm">
                      {tp("dnssecDescription")}
                    </p>
                  </div>
                  <span className="border-outline-variant/40 bg-surface rounded-full border px-3 py-1 text-xs font-semibold uppercase">
                    {dnssecStatus?.enabled ? tp("dnssecActive") : tp("dnssecInactive")}
                  </span>
                </div>

                {!dnssecStatus?.supported ? (
                  <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                    {tp("dnssecManagedRequired")}
                  </p>
                ) : null}

                {dnssecStatus?.dsRecords.length ? (
                  <div className="bg-surface mt-4 rounded-lg p-3">
                    <p className="text-on-surface-variant text-xs font-semibold uppercase">
                      {tp("dnssecDsRecords")}
                    </p>
                    <div className="mt-2 space-y-2">
                      {dnssecStatus.dsRecords.map((record) => (
                        <code
                          key={record}
                          className="text-on-surface block break-all rounded-lg bg-black/5 px-3 py-2 text-xs dark:bg-white/5"
                        >
                          {record}
                        </code>
                      ))}
                    </div>
                    <p className="text-on-surface-variant mt-2 text-xs">
                      {tp("dnssecRegistrarHint")}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5">
                  <button
                    type="button"
                    disabled={providerBusy || !dnssecStatus?.supported}
                    onClick={() => void handleDnssecToggle(!dnssecStatus?.enabled)}
                    className={
                      dnssecStatus?.enabled
                        ? "border-error/40 text-error rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        : "bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    }
                  >
                    {providerBusy
                      ? tu("loading")
                      : dnssecStatus?.enabled
                        ? tp("dnssecDisable")
                        : tp("dnssecEnable")}
                  </button>
                </div>
              </div>
              <p className="text-on-surface-variant text-xs">{tp("dnssecSecurityHint")}</p>
            </div>
          )}

          <div className="border-outline-variant/30 flex flex-wrap items-center gap-3 border-t pt-5">
            {activePanel !== "cloudflare" && activePanel !== "dnssec" ? (
              <button
                type="submit"
                disabled={
                  saving ||
                  domain?.status !== "ACTIVE" ||
                  (activePanel === "nameservers" && nameserversManaged)
                }
                className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? tu("loading") : tp("saveSettings")}
              </button>
            ) : null}
            <Link
              href="/dashboard/domains"
              className="text-secondary text-sm font-medium hover:underline"
            >
              {tc("backToDomains")}
            </Link>
          </div>
        </form>
      </div>

      {message && (
        <p className="border-secondary/30 bg-secondary/10 text-secondary rounded-xl border px-4 py-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p className="border-error/30 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
