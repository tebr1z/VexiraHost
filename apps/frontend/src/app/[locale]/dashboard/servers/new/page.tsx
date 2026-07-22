"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  listServerPlans,
  provisionServer,
  REGION_LABELS,
  type ServerPlan,
} from "@/features/servers";

export default function NewServerPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.servers");
  const [plans, setPlans] = useState<ServerPlan[]>([]);
  const [planSlug, setPlanSlug] = useState("");
  const [hostname, setHostname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("fra-01");
  const [osTemplate, setOsTemplate] = useState("ubuntu-22.04");
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.slug === planSlug);

  useEffect(() => {
    listServerPlans()
      .then((data) => {
        setPlans(data);
        if (data[0]) setPlanSlug(data[0].slug);
      })
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    if (selectedPlan && !selectedPlan.regions.includes(region)) {
      setRegion(selectedPlan.regions[0] ?? "fra-01");
    }
  }, [selectedPlan, region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const server = await provisionServer({
        planSlug,
        hostname: hostname.trim(),
        displayName: displayName.trim() || undefined,
        region,
        osTemplate,
      });
      router.push(`/dashboard/servers/${server.id}`);
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tc("provisioningFailed");
      setError(message ?? tc("provisioningFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (plansLoading) {
    return <LoadingSkeletonList rows={4} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={tp("deployTitle")}
        description={tp("deployDescription")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.servers"), href: "/dashboard/servers" },
          { label: tp("deployBreadcrumb") },
        ]}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-outline-variant/50 bg-surface p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium">{tc("plan")}</label>
          <select
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          >
            {plans.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.name} — {plan.cpuCores} vCPU, {plan.ramGb}GB RAM, {plan.diskGb}GB disk · ${plan.price}/mo
              </option>
            ))}
          </select>
        </div>

        {selectedPlan && (
          <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            {selectedPlan.description} · {selectedPlan.type} · {selectedPlan.bandwidthGbps} Gbps
          </p>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">{tc("hostname")}</label>
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder={tc("hostnamePlaceholder")}
            required
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{tc("displayNameOptional")}</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={tc("displayNamePlaceholder")}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{tc("region")}</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          >
            {(selectedPlan?.regions ?? ["fra-01"]).map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r] ?? r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{tc("osTemplate")}</label>
          <select
            value={osTemplate}
            onChange={(e) => setOsTemplate(e.target.value)}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          >
            <option value="ubuntu-22.04">Ubuntu 22.04 LTS</option>
            <option value="ubuntu-24.04">Ubuntu 24.04 LTS</option>
            <option value="debian-12">Debian 12</option>
            <option value="rocky-9">Rocky Linux 9</option>
          </select>
        </div>

        {error && (
          <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !hostname.trim()}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-on-primary disabled:opacity-60"
        >
          {loading ? tc("provisioning") : tc("deployServer")}
        </button>
      </form>
    </div>
  );
}
