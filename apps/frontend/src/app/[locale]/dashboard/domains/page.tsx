"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DataTable,
  EditIconLink,
  EmptyState,
  LoadingSkeletonList,
  PageHeader,
  StatusBadge,
  TableRowActions,
} from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listDomains, type UserDomain } from "@/features/domains";
import { Link } from "@/i18n/navigation";

export default function DomainsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.domains");
  const tc = useTranslations("dashboard.common");
  const tt = useTranslations("ui.table");
  const tu = useTranslations("ui");
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
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
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
              render: (row) => {
                const d = row as unknown as UserDomain;
                return (
                  <div className="space-y-1">
                    <StatusBadge status={d.status} />
                    {d.status === "SUSPENDED" ? (
                      <p className="max-w-xs text-xs text-amber-800 dark:text-amber-200">
                        {tc("suspendedBody")}
                      </p>
                    ) : null}
                  </div>
                );
              },
            },
            {
              key: "expiresAt",
              header: tp("expiresColumn"),
              sortable: true,
              render: (row) => {
                const d = row as unknown as UserDomain;
                return d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "—";
              },
            },
            {
              key: "actions",
              header: tt("actions"),
              render: (row) => {
                const d = row as unknown as UserDomain;
                return (
                  <TableRowActions>
                    <EditIconLink href={`/dashboard/domains/${d.id}`} label={tu("view")} />
                    {d.status === "SUSPENDED" ? (
                      <Link
                        href={
                          d.renewalInvoiceId
                            ? `/dashboard/invoices/${d.renewalInvoiceId}`
                            : "/dashboard/invoices"
                        }
                        className="text-xs font-semibold text-amber-800 hover:underline"
                      >
                        {tc("payInvoice")}
                      </Link>
                    ) : null}
                  </TableRowActions>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
