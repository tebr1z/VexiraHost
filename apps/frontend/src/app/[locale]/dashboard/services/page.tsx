"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CopyableField } from "@/components/ui/copyable-field";
import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listAddons, provisionAddon, type AddonService, type AddonType } from "@/features/addons";
import { formatDate } from "@/lib/i18n/format";

const ADDON_TYPES: AddonType[] = ["LICENSE", "SSL", "EMAIL", "BACKUP"];

function getLicenseKey(service: AddonService): string | null {
  const meta = service.metadata;
  if (!meta) return service.identifier;
  const key = meta.licenseKey;
  return typeof key === "string" ? key : service.identifier;
}

function getDownloadUrl(service: AddonService): string | null {
  const url = service.metadata?.downloadUrl;
  return typeof url === "string" ? url : null;
}

export default function ServicesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.services");
  const [services, setServices] = useState<AddonService[]>([]);
  const [type, setType] = useState<AddonType>("SSL");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listAddons()
      .then(setServices)
      .finally(() => setListLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await provisionAddon({
        type,
        name: name.trim(),
        identifier: identifier.trim() || undefined,
      });
      setName("");
      setIdentifier("");
      await load();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : "Failed to activate service";
      setError(msg ?? "Failed to activate service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.services") },
        ]}
      />

      <form
        onSubmit={handleProvision}
        className="card-3d grid gap-4 rounded-2xl border border-outline-variant/50 bg-surface p-6 sm:grid-cols-2"
      >
        <h2 className="font-semibold text-primary sm:col-span-2">Activate new service</h2>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AddonType)}
          className="h-12 rounded-xl border border-outline-variant px-4 sm:col-span-2"
        >
          {ADDON_TYPES.map((value) => (
            <option key={value} value={value}>
              {tp(`categories.${value}`)}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Service name"
          required
          className="h-12 rounded-xl border border-outline-variant px-4"
        />
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Domain / email (optional)"
          className="h-12 rounded-xl border border-outline-variant px-4"
        />
        {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-xl bg-primary font-semibold text-on-primary sm:col-span-2 disabled:opacity-60"
        >
          {loading ? "Provisioning..." : "Activate service"}
        </button>
      </form>

      {listLoading ? (
        <LoadingSkeletonList rows={3} />
      ) : services.length === 0 ? (
        <EmptyState title={tp("empty")} description={tp("emptyDesc")} />
      ) : (
        <ul className="space-y-4">
          {services.map((service) => {
            const licenseKey = service.type === "LICENSE" ? getLicenseKey(service) : null;
            const downloadUrl = getDownloadUrl(service);

            return (
              <li
                key={service.id}
                className="rounded-2xl border border-outline-variant/50 bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{service.name}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {tp(`categories.${service.type}`)}
                      {service.identifier ? ` · ${service.identifier}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={service.status} />
                </div>

                {licenseKey && (
                  <div className="mt-4 space-y-3">
                    <CopyableField
                      label={tp("licenseKey")}
                      value={licenseKey}
                      copyLabel={tp("copy")}
                      copiedLabel={tp("copied")}
                    />
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-btn apple-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        {tp("download")}
                      </a>
                    )}
                  </div>
                )}

                {service.expiresAt && (
                  <p className="mt-3 text-sm text-on-surface-variant">
                    {tp("expires")}: {formatDate(service.expiresAt, locale)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
