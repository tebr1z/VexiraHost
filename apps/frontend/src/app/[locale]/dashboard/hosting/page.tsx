"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  EmptyState,
  LoadingSkeletonList,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listHostingAccounts, type HostingAccount } from "@/features/hosting";

export default function HostingPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.hosting");
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHostingAccounts()
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.hosting") },
        ]}
        actions={
          <Link
            href="/dashboard/hosting/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("emptyAction")}
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={3} />
      ) : accounts.length === 0 ? (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("emptyAction")}
          actionHref="/dashboard/hosting/new"
        />
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              href={`/dashboard/hosting/${acc.id}`}
              className="card-3d card-3d-hover block rounded-2xl border border-outline-variant/50 bg-surface p-5 transition hover:border-secondary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-primary">{acc.primaryDomain}</p>
                  <p className="text-sm text-on-surface-variant">
                    {acc.plan.name} · {acc.panel}
                    {acc.server ? ` · ${acc.server.name}` : ""}
                  </p>
                </div>
                <StatusBadge status={acc.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
