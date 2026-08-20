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
    let cancelled = false;
    setLoading(true);
    Promise.all([listServers(), listHostingAccounts()])
      .then(([serverRows, hostingRows]) => {
        if (cancelled) return;
        setServers(serverRows);
        setManualServers(
          hostingRows.filter(
            (acc) => acc.managementMode === "MANUAL" && acc.serviceCategory === "SERVER",
          ),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setServers([]);
        setManualServers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
                className="dashboard-nav-card group block rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="bg-[var(--accent)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--accent)]">
                      <span className="material-symbols-outlined text-[22px]">dns</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent)]">
                        {server.displayName}
                      </p>
                      <p className="text-sm text-[var(--label-secondary)]">{server.hostname}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={server.status} />
                    <span className="dashboard-nav-card-chevron inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--label-tertiary)]">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </span>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--label-secondary)]">{tc("type")}</dt>
                    <dd className="font-medium text-[var(--label-primary)]">{server.type}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--label-secondary)]">{tc("region")}</dt>
                    <dd className="font-medium text-[var(--label-primary)]">
                      {server.regionLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--label-secondary)]">{tc("ip")}</dt>
                    <dd className="font-medium text-[var(--label-primary)]">
                      {server.ipv4 ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--label-secondary)]">{tc("specs")}</dt>
                    <dd className="font-medium text-[var(--label-primary)]">
                      {server.cpuCores} vCPU · {server.ramGb}GB RAM
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm font-medium text-[var(--accent)]">
                  {tc("manageServer")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
