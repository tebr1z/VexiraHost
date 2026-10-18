"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { HostingAccountCard } from "@/components/hosting/hosting-account-card";
import { EmptyState, LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listHostingAccounts, type HostingAccount } from "@/features/hosting";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";

function isHostingVisible(acc: HostingAccount): boolean {
  if (acc.managementMode !== "MANUAL") return true;
  return acc.serviceCategory !== "SERVER";
}

function isCancelledStatus(status: string): boolean {
  return status === "CANCELLED" || status === "EXPIRED";
}

export default function HostingPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.hosting");
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listHostingAccounts()
      .then((rows) => {
        if (!cancelled) {
          setAccounts(rows.filter(isHostingVisible));
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAccounts([]);
          setError(getApiErrorMessage(err, tp("loadFailed")));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tp]);

  const activeAccounts = useMemo(
    () => accounts.filter((acc) => !isCancelledStatus(acc.status)),
    [accounts],
  );
  const cancelledAccounts = useMemo(
    () => accounts.filter((acc) => isCancelledStatus(acc.status)),
    [accounts],
  );

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
            href="/hosting"
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
          >
            {tp("emptyAction")}
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={3} />
      ) : error ? (
        <EmptyState title={tp("loadFailed")} description={error} />
      ) : accounts.length === 0 ? (
        <EmptyState title={tp("empty")} actionLabel={tp("emptyAction")} actionHref="/hosting" />
      ) : (
        <div className="space-y-8">
          {activeAccounts.length > 0 ? (
            <div className="space-y-4">
              {activeAccounts.map((acc) => (
                <HostingAccountCard key={acc.id} account={acc} locale={locale} />
              ))}
            </div>
          ) : null}
          {cancelledAccounts.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--label-secondary)]">
                {tp("cancelledSection", { count: cancelledAccounts.length })}
              </h2>
              <div className="space-y-4 opacity-90">
                {cancelledAccounts.map((acc) => (
                  <HostingAccountCard key={acc.id} account={acc} locale={locale} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
