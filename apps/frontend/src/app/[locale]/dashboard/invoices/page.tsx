"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { downloadInvoicePdf, listInvoices, type Invoice } from "@/features/billing";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";

function invoiceDue(inv: Invoice): number {
  if (inv.status === "PAID" || inv.status === "VOID") return 0;
  return inv.amountDue ?? Math.max(0, inv.total - (inv.amountPaid ?? 0));
}

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
    const open = invoices.filter((inv) => inv.status === "OPEN" || inv.status === "OVERDUE");
    const openTotal = open.reduce((sum, inv) => sum + invoiceDue(inv), 0);
    const currency = open[0]?.currency ?? invoices[0]?.currency ?? "USD";
    return { openCount: open.length, openTotal, currency };
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
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={tp("statTotal")} value={String(invoices.length)} />
            <StatCard label={tp("statOpen")} value={String(stats.openCount)} />
            <StatCard
              label={tp("statOpenAmount")}
              value={formatMoney(stats.openTotal, stats.currency, locale)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)]">
            <ul className="divide-y divide-[var(--separator)]">
              {invoices.map((inv) => {
                const due = invoiceDue(inv);
                const showDue = inv.status === "OPEN" || inv.status === "OVERDUE";

                return (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-4 px-4 py-4 transition hover:bg-[var(--fill-secondary)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="font-jakarta text-base font-semibold text-[var(--label)] hover:text-[var(--accent)] hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-sm text-[var(--label-secondary)]">
                        {tp("issuedOn")}: {formatDate(inv.createdAt, locale)}
                        {" · "}
                        {tc("due", { date: formatDate(inv.dueDate, locale) })}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="font-jakarta text-lg font-bold tabular-nums text-[var(--label)]">
                          {formatMoney(showDue ? due : inv.total, inv.currency, locale)}
                        </p>
                        {showDue && (inv.amountPaid ?? 0) > 0 ? (
                          <p className="text-xs text-[var(--label-secondary)]">
                            {tc("total")}: {formatMoney(inv.total, inv.currency, locale)}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownloadPdf(inv.id)}
                          disabled={downloadingId === inv.id}
                          className="inline-flex h-9 items-center rounded-lg border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 text-sm font-medium text-[var(--label)] transition hover:bg-[var(--fill-secondary)] disabled:opacity-60"
                        >
                          {downloadingId === inv.id ? tp("downloadingPdf") : tp("downloadPdf")}
                        </button>
                        {showDue ? (
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            className="inline-flex h-9 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
                          >
                            {tc("payInvoice")}
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            className="inline-flex h-9 items-center rounded-lg border border-[var(--separator)] px-4 text-sm font-medium text-[var(--label)] transition hover:bg-[var(--fill-secondary)]"
                          >
                            {tp("viewInvoice")}
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
        {label}
      </p>
      <p className="font-jakarta mt-1 text-xl font-bold tabular-nums text-[var(--label)]">
        {value}
      </p>
    </div>
  );
}
