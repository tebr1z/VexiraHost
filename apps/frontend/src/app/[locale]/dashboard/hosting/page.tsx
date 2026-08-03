"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HostingAccountCard } from "@/components/hosting/hosting-account-card";
import { EmptyState, LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listHostingAccounts, type HostingAccount } from "@/features/hosting";
import { Link } from "@/i18n/navigation";

function isHostingVisible(acc: HostingAccount): boolean {
  if (acc.managementMode !== "MANUAL") return true;
  return acc.serviceCategory !== "SERVER";
}

export default function HostingPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.hosting");
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHostingAccounts()
      .then((rows) => setAccounts(rows.filter(isHostingVisible)))
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
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
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
            <HostingAccountCard key={acc.id} account={acc} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
