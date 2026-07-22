"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listDomains, type UserDomain } from "@/features/domains";

export default function DomainsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.domains");
  const tt = useTranslations("ui.table");
  const [domains, setDomains] = useState<UserDomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDomains()
      .then(setDomains)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.domains") },
        ]}
        actions={
          <Link
            href="/domains/search"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("emptyAction")}
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={4} />
      ) : domains.length === 0 ? (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("emptyAction")}
          actionHref="/domains/search"
        />
      ) : (
        <DataTable
          data={domains as unknown as Record<string, unknown>[]}
          getRowKey={(row) => String(row.id)}
          columns={[
            {
              key: "name",
              header: "Domain",
              sortable: true,
              render: (row) => (
                <span className="font-semibold">{(row as unknown as UserDomain).name}</span>
              ),
            },
            {
              key: "status",
              header: tt("status"),
              render: (row) => <StatusBadge status={(row as unknown as UserDomain).status} />,
            },
            {
              key: "expiresAt",
              header: "Expires",
              sortable: true,
              render: (row) => {
                const d = row as unknown as UserDomain;
                return d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "—";
              },
            },
            {
              key: "dns",
              header: "DNS",
              render: (row) => {
                const d = row as unknown as UserDomain;
                if (d.status !== "ACTIVE") return "—";
                return (
                  <Link href={`/dashboard/domains/${d.id}`} className="text-secondary hover:underline">
                    Manage ({d.dnsRecordCount})
                  </Link>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
