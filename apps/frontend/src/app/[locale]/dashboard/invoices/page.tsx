"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { downloadInvoicePdf, listInvoices, type Invoice } from "@/features/billing";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";

export default function InvoicesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    listInvoices()
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const open = invoices.filter((inv) => inv.status === "OPEN");
    const paid = invoices.filter((inv) => inv.status === "PAID");
    const openTotal = open.reduce((sum, inv) => sum + inv.total, 0);
    const currency = invoices[0]?.currency ?? "USD";
    return { openCount: open.length, paidCount: paid.length, openTotal, currency };
  }, [invoices]);

  const handleDownloadPdf = async (invoiceId: string) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    setDownloadingId(invoiceId);
    try {
      await downloadInvoicePdf(invoiceId, token);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.invoices") },
        ]}
      />

      {loading ? (
        <LoadingSkeletonList rows={4} />
      ) : invoices.length === 0 ? (
        <EmptyState title={tp("empty")} actionLabel={t("nav.cart")} actionHref="/dashboard/cart" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={tp("statTotal")} value={String(invoices.length)} />
            <StatCard label={tp("statOpen")} value={String(stats.openCount)} />
            <StatCard
              label={tp("statOpenAmount")}
              value={formatMoney(stats.openTotal, stats.currency, locale)}
            />
          </div>

          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="panel-card flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="font-jakarta text-base font-semibold text-primary hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {tp("issuedOn")}: {formatDate(inv.createdAt, locale)} · {tc("due", { date: formatDate(inv.dueDate, locale) })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                  <p className="font-jakarta text-lg font-bold text-primary">
                    {formatMoney(inv.total, inv.currency, locale)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadPdf(inv.id)}
                      disabled={downloadingId === inv.id}
                      className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-primary hover:bg-slate-50 disabled:opacity-60"
                    >
                      {downloadingId === inv.id ? tp("downloadingPdf") : tp("downloadPdf")}
                    </button>
                    {inv.status === "OPEN" ? (
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary"
                      >
                        {tc("payInvoice")}
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="inline-flex h-9 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-primary hover:bg-slate-50"
                      >
                        {tp("viewInvoice")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="panel-card rounded-lg px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 font-jakarta text-xl font-bold text-primary">{value}</p>
    </div>
  );
}
