"use client";

import { ApiClientError } from "@vexira/api-sdk";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DEFAULT_NAMESERVERS,
  DomainNameserversEditor,
} from "@/components/domains/domain-nameservers-editor";
import {
  DEFAULT_NS_GLUE,
  DomainNsGlueEditor,
  validateGlueEntries,
  type NsGlueEntry,
} from "@/components/domains/domain-ns-glue-editor";
import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { getDomain, updateNsGlue, type UserDomain } from "@/features/domains";
import { Link } from "@/i18n/navigation";

type SettingsPanel = "nameservers" | "glue";

function buildGlueFromDomain(domain: UserDomain): NsGlueEntry[] {
  if (domain.nsGlueRecords.length > 0) {
    return domain.nsGlueRecords;
  }
  return DEFAULT_NS_GLUE;
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
  const [activePanel, setActivePanel] = useState<SettingsPanel>("nameservers");
  const [nameservers, setNameservers] = useState<string[]>(DEFAULT_NAMESERVERS);
  const [nsGlueEntries, setNsGlueEntries] = useState<NsGlueEntry[]>(DEFAULT_NS_GLUE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDomain(domainId)
      .then((domainData) => {
        setDomain(domainData);
        setNameservers(buildNameserversFromDomain(domainData));
        setNsGlueEntries(buildGlueFromDomain(domainData));
      })
      .catch(() => setError(tc("dnsLoadFailed")))
      .finally(() => setLoading(false));
  }, [domainId, tc]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:w-56 lg:shrink-0">
          <p className="text-on-surface-variant mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
            {tp("settingsNavLabel")}
          </p>
          <nav className="flex flex-row gap-2 lg:flex-col">
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
          </nav>
        </aside>

        <form className="card-3d min-w-0 flex-1 space-y-6 rounded-2xl p-6" onSubmit={handleSave}>
          {activePanel === "nameservers" ? (
            <DomainNameserversEditor
              nameservers={nameservers}
              onChange={setNameservers}
              translationScope="dashboard"
            />
          ) : (
            <DomainNsGlueEditor
              entries={nsGlueEntries}
              onChange={setNsGlueEntries}
              translationScope="dashboard"
              onValidationError={(msg) => {
                if (msg) setError(msg);
              }}
            />
          )}

          <div className="border-outline-variant/30 flex flex-wrap items-center gap-3 border-t pt-5">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? tu("loading") : tp("saveSettings")}
            </button>
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
