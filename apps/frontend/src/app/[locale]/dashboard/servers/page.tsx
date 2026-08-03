"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ManualServiceCard } from "@/components/services/manual-service-card";
import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listHostingAccounts, type HostingAccount } from "@/features/hosting";
import { listServers, type ServerInstance } from "@/features/servers";
import { Link } from "@/i18n/navigation";

export default function ServersPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.servers");
  const tc = useTranslations("dashboard.common");
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [manualServers, setManualServers] = useState<HostingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listServers(), listHostingAccounts()])
      .then(([serverRows, hostingRows]) => {
        setServers(serverRows);
        setManualServers(
          hostingRows.filter(
            (acc) => acc.managementMode === "MANUAL" && acc.serviceCategory === "SERVER",
          ),
        );
      })
      .catch(() => {
        setServers([]);
        setManualServers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const isEmpty = servers.length === 0 && manualServers.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.servers") },
        ]}
        actions={
          <Link
            href="/dashboard/servers/new"
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
          >
            {tp("emptyAction")}
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={3} />
      ) : isEmpty ? (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("emptyAction")}
          actionHref="/dashboard/servers/new"
        />
      ) : (
        <div className="space-y-4">
          {manualServers.map((account) => (
            <ManualServiceCard
              key={account.id}
              account={account}
              locale={locale}
              detailHref={`/dashboard/hosting/${account.id}`}
            />
          ))}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {servers.map((server) => (
              <Link
                key={server.id}
                href={`/dashboard/servers/${server.id}`}
                className="card-3d card-3d-hover border-outline-variant/50 bg-surface hover:border-secondary/40 rounded-2xl border p-5 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-primary font-semibold">{server.displayName}</p>
                    <p className="text-on-surface-variant text-sm">{server.hostname}</p>
                  </div>
                  <StatusBadge status={server.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-on-surface-variant">{tc("type")}</dt>
                    <dd className="font-medium">{server.type}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">{tc("region")}</dt>
                    <dd className="font-medium">{server.regionLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">{tc("ip")}</dt>
                    <dd className="font-medium">{server.ipv4 ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">{tc("specs")}</dt>
                    <dd className="font-medium">
                      {server.cpuCores} vCPU · {server.ramGb}GB RAM
                    </dd>
                  </div>
                </dl>
                <p className="text-secondary mt-3 text-sm font-medium">{tc("manageServer")} →</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
