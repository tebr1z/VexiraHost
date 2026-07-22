"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listServers, type ServerInstance } from "@/features/servers";

export default function ServersPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.servers");
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listServers()
      .then(setServers)
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  }, []);

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
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("emptyAction")}
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={3} />
      ) : servers.length === 0 ? (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("emptyAction")}
          actionHref="/dashboard/servers/new"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {servers.map((server) => (
            <Link
              key={server.id}
              href={`/dashboard/servers/${server.id}`}
              className="card-3d card-3d-hover rounded-2xl border border-outline-variant/50 bg-surface p-5 transition hover:border-secondary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">{server.displayName}</p>
                  <p className="text-sm text-on-surface-variant">{server.hostname}</p>
                </div>
                <StatusBadge status={server.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-on-surface-variant">Type</dt>
                  <dd className="font-medium">{server.type}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Region</dt>
                  <dd className="font-medium">{server.regionLabel}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">IP</dt>
                  <dd className="font-medium">{server.ipv4 ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Specs</dt>
                  <dd className="font-medium">
                    {server.cpuCores} vCPU · {server.ramGb}GB RAM
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
