"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ManualServiceCard } from "@/components/services/manual-service-card";
import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { CopyableField } from "@/components/ui/copyable-field";
import { listAddons, provisionAddon, type AddonService, type AddonType } from "@/features/addons";
import { useRequireAuth } from "@/features/auth";
import { listHostingAccounts, type HostingAccount } from "@/features/hosting";
import {
  getWhatsappApiDashboard,
  type WhatsappApiDashboard,
} from "@/features/whatsapp-api/services/whatsapp-api.service";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n/format";

const ADDON_TYPES: AddonType[] = ["LICENSE", "SSL", "EMAIL", "BACKUP"];

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getLicenseKey(service: AddonService): string | null {
  if (service.type !== "LICENSE") return null;
  return metaString(service.metadata, "licenseKey") ?? service.identifier;
}

function getDownloadUrl(service: AddonService): string | null {
  return metaString(service.metadata, "downloadUrl");
}

function metaNumber(meta: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = meta?.[key];
  return typeof value === "number" ? value : null;
}

function isPendingWhatsapp(service: AddonService): boolean {
  const meta = service.metadata as Record<string, unknown> | null | undefined;
  return (
    service.type === "WHATSAPP_API" &&
    (meta?.pendingManualApproval === true || metaString(meta, "pendingManualApproval") === "true")
  );
}

export default function ServicesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.services");
  const [services, setServices] = useState<AddonService[]>([]);
  const [pleskServices, setPleskServices] = useState<HostingAccount[]>([]);
  const [type, setType] = useState<AddonType>("SSL");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappUsage, setWhatsappUsage] = useState<WhatsappApiDashboard["access"] | null>(null);
  const showAdminWhatsappService = Boolean(
    whatsappUsage?.isEnabled && !services.some((service) => service.type === "WHATSAPP_API"),
  );

  const load = () => {
    setListLoading(true);
    return Promise.all([
      listAddons(),
      listHostingAccounts(),
      getWhatsappApiDashboard().catch(() => null),
    ])
      .then(([addons, hosting, whatsapp]) => {
        setServices(addons);
        setPleskServices(hosting.filter((acc) => acc.managementMode === "MANUAL"));
        setWhatsappUsage(whatsapp?.access ?? null);
      })
      .finally(() => setListLoading(false));
  };

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
        className="card-3d border-outline-variant/50 bg-surface grid gap-4 rounded-2xl border p-6 sm:grid-cols-2"
      >
        <h2 className="text-primary font-semibold sm:col-span-2">Activate new service</h2>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AddonType)}
          className="border-outline-variant h-12 rounded-xl border px-4 sm:col-span-2"
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
          className="border-outline-variant h-12 rounded-xl border px-4"
        />
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Domain / email (optional)"
          className="border-outline-variant h-12 rounded-xl border px-4"
        />
        {error && <p className="text-error text-sm sm:col-span-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-on-primary h-12 rounded-xl font-semibold disabled:opacity-60 sm:col-span-2"
        >
          {loading ? "Provisioning..." : "Activate service"}
        </button>
      </form>

      {!listLoading && showAdminWhatsappService && whatsappUsage ? (
        <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-primary font-semibold">{tp("categories.WHATSAPP_API")}</p>
              <p className="text-on-surface-variant mt-1 text-sm">{tp("whatsappAdminActivated")}</p>
            </div>
            <StatusBadge status="ACTIVE" />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <UsageMetric label={tp("whatsappUsed")} value={whatsappUsage.used} />
            <UsageMetric label={tp("whatsappRemaining")} value={whatsappUsage.remaining} />
            <UsageMetric label={tp("whatsappFailed")} value={whatsappUsage.failed} />
          </div>

          <Link
            href="/dashboard/whatsapp-api"
            className="apple-btn apple-btn-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-base">api</span>
            {tp("whatsappOpenPanel")}
          </Link>
        </section>
      ) : null}

      {pleskServices.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-primary text-lg font-semibold">{tp("pleskTitle")}</h2>
            <p className="text-on-surface-variant text-sm">{tp("pleskDescription")}</p>
          </div>
          <div className="space-y-4">
            {pleskServices.map((account) => (
              <ManualServiceCard
                key={account.id}
                account={account}
                locale={locale}
                detailHref={
                  account.serviceCategory === "SERVER"
                    ? "/dashboard/servers"
                    : `/dashboard/hosting/${account.id}`
                }
              />
            ))}
          </div>
        </section>
      )}

      {listLoading ? (
        <LoadingSkeletonList rows={3} />
      ) : services.length === 0 && pleskServices.length === 0 && !showAdminWhatsappService ? (
        <EmptyState title={tp("empty")} description={tp("emptyDesc")} />
      ) : (
        <ul className="space-y-4">
          {services.map((service) => {
            const licenseKey = getLicenseKey(service);
            const downloadUrl = getDownloadUrl(service);
            const downloadFileName = metaString(service.metadata, "downloadFileName");
            const promoText = metaString(service.metadata, "promoText");
            const guideText = metaString(service.metadata, "activationGuideText");
            const guideImage = metaString(service.metadata, "activationGuideImageUrl");
            const guideVideo = metaString(service.metadata, "activationGuideVideoUrl");

            return (
              <li
                key={service.id}
                className="border-outline-variant/50 bg-surface rounded-2xl border p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-primary font-semibold">{service.name}</p>
                    <p className="text-on-surface-variant mt-1 text-sm">
                      {tp(`categories.${service.type}`)}
                      {service.identifier ? ` · ${service.identifier}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={service.status} />
                </div>

                {promoText && (
                  <p className="text-on-surface-variant mt-3 whitespace-pre-wrap text-sm">
                    {promoText}
                  </p>
                )}

                {service.type === "WHATSAPP_API" && (
                  <div className="mt-4 space-y-3">
                    {metaNumber(service.metadata, "messageLimit") != null && (
                      <p className="text-on-surface-variant text-sm">
                        {tp("whatsappMessageLimit", {
                          limit: metaNumber(service.metadata, "messageLimit") ?? 0,
                        })}
                      </p>
                    )}
                    {whatsappUsage && service.status === "ACTIVE" && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="bg-surface-container-low rounded-xl px-3 py-2 text-sm">
                          <span className="text-on-surface-variant block text-xs">
                            {tp("whatsappUsed")}
                          </span>
                          <span className="font-semibold">{whatsappUsage.used}</span>
                        </div>
                        <div className="bg-surface-container-low rounded-xl px-3 py-2 text-sm">
                          <span className="text-on-surface-variant block text-xs">
                            {tp("whatsappRemaining")}
                          </span>
                          <span className="font-semibold">{whatsappUsage.remaining}</span>
                        </div>
                        <div className="bg-surface-container-low rounded-xl px-3 py-2 text-sm">
                          <span className="text-on-surface-variant block text-xs">
                            {tp("whatsappFailed")}
                          </span>
                          <span className="font-semibold">{whatsappUsage.failed ?? 0}</span>
                        </div>
                      </div>
                    )}
                    {isPendingWhatsapp(service) ? (
                      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                        {tp("whatsappAwaitingActivation")}
                      </p>
                    ) : service.status === "ACTIVE" ? (
                      <Link
                        href="/dashboard/whatsapp-api"
                        className="apple-btn apple-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-base">api</span>
                        {tp("whatsappOpenPanel")}
                      </Link>
                    ) : null}
                  </div>
                )}

                {service.type === "LICENSE" && (
                  <div className="mt-4 space-y-4">
                    {licenseKey && (
                      <CopyableField
                        label={tp("licenseKey")}
                        value={licenseKey}
                        copyLabel={tp("copy")}
                        copiedLabel={tp("copied")}
                      />
                    )}
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-btn apple-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        {downloadFileName
                          ? `${tp("download")} · ${downloadFileName}`
                          : tp("download")}
                      </a>
                    )}

                    {(guideText || guideImage || guideVideo) && (
                      <div className="border-outline-variant/50 bg-surface-container-low/50 rounded-xl border p-4">
                        <p className="mb-2 text-sm font-semibold">{tp("howToActivate")}</p>
                        {guideText && (
                          <p className="text-on-surface-variant whitespace-pre-wrap text-sm">
                            {guideText}
                          </p>
                        )}
                        {guideImage && (
                          <img
                            src={guideImage}
                            alt={tp("howToActivate")}
                            className="mt-3 max-h-64 w-full rounded-lg object-contain"
                          />
                        )}
                        {guideVideo && (
                          <a
                            href={guideVideo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                          >
                            <span className="material-symbols-outlined text-base">play_circle</span>
                            {tp("watchGuide")}
                          </a>
                        )}
                      </div>
                    )}

                    {metaString(service.metadata, "pendingManualDelivery") === "true" ||
                    service.metadata?.pendingManualDelivery === true ? (
                      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                        {tp("awaitingActivation")}
                      </p>
                    ) : null}
                  </div>
                )}

                {service.expiresAt && (
                  <p className="text-on-surface-variant mt-3 text-sm">
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

function UsageMetric({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="bg-surface-container-low rounded-xl px-3 py-2 text-sm">
      <span className="text-on-surface-variant block text-xs">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
