"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { listAdminHostingPlans, type AdminHostingPlan, type HostingServer } from "@/features/admin";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";

export function HostingServerPackages({ server }: { server: HostingServer }): React.ReactElement {
  const t = useTranslations("admin.forms.serverWorkflow");
  const tf = useTranslations("admin.forms");
  const [plans, setPlans] = useState<AdminHostingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAdminHostingPlans()
      .then((rows) => {
        if (cancelled) return;
        setPlans(
          rows.filter(
            (plan) =>
              plan.serverId === server.id ||
              plan.servers?.some((linked) => linked.id === server.id) ||
              plan.autoDeployServerId === server.id,
          ),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t("loadPlansFailed")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [server.id, t]);

  const newPlanHref = `/t4abriz/panel/hosting/plans/new?serverId=${encodeURIComponent(server.id)}`;
  const canCreateDeployPlan =
    server.isActive && server.panel === "PLESK" && server.deployNodeEnabled;

  return (
    <section className="border-outline-variant/50 bg-surface space-y-5 rounded-2xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-on-surface text-lg font-semibold">{t("packagesTitle")}</h2>
          <p className="text-on-surface-variant mt-1 max-w-xl text-sm">{t("packagesHint")}</p>
        </div>
        {server.isActive ? (
          <Link
            href={newPlanHref}
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
          >
            {t("newPackage")}
          </Link>
        ) : (
          <p className="text-on-surface-variant text-sm">{t("activateFirst")}</p>
        )}
      </div>

      <div className="bg-surface-container-low flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
        <div>
          <p className="text-sm font-semibold">
            {server.deployNodeEnabled ? t("deployAvailable") : t("hostingOnly")}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">{t("perPackageHint")}</p>
        </div>
        {canCreateDeployPlan ? (
          <Link
            href={`${newPlanHref}&autoDeploy=1`}
            className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
          >
            {t("newDeployPackage")}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-sm">{t("loadingPlans")}</p>
      ) : error ? (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      ) : plans.length === 0 ? (
        <p className="text-on-surface-variant text-sm">{t("noPackages")}</p>
      ) : (
        <ul className="divide-outline-variant/40 divide-y">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <Link
                  href={`/t4abriz/panel/hosting/plans/${plan.id}`}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {plan.name}
                </Link>
                <p className="text-on-surface-variant mt-1 text-xs">
                  {t("hostingQuota", { gb: plan.diskGb })}
                </p>
                {plan.autoDeployEnabled ? (
                  <p className="text-on-surface-variant mt-1 text-xs">
                    {t("deployQuota", { gb: plan.autoDeployDiskGb, apps: plan.autoDeployMaxApps })}
                    {` · CPU ${plan.autoDeployCpuPercent ?? 100}% · RAM ${plan.autoDeployMemoryMb ?? 1024} MB`}
                    {plan.autoDeployServer ? ` · ${plan.autoDeployServer.name}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-surface-container-low rounded-full px-3 py-1.5">
                  {plan.autoDeployEnabled ? t("deployAvailable") : t("hostingOnly")}
                </span>
                <span className="bg-surface-container-low text-on-surface-variant rounded-full px-3 py-1.5">
                  {plan.isActive ? tf("active") : t("inactive")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
