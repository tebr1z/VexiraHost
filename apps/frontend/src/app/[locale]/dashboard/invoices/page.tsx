"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  LoadingSkeletonList,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { downloadInvoicePdf, listInvoices, type Invoice } from "@/features/billing";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigationProgressStore } from "@/stores/navigation-progress-store";

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
  const router = useRouter();
  const startNav = useNavigationProgressStore((s) => s.start);

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
    <div className="space-y-8">
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

          <div className="overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-sm">
            <ul className="divide-y divide-[var(--separator)]">
              {invoices.map((inv) => {
                const due = invoiceDue(inv);
                const showDue = inv.status === "OPEN" || inv.status === "OVERDUE";
                const href = `/dashboard/invoices/${inv.id}`;

                return (
                  <li key={inv.id}>
                    <div
                      role="link"
                      tabIndex={0}
                      className={cn(
                        "dashboard-list-row group flex cursor-pointer flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
                      )}
                      onClick={(event) => {
                        const target = event.target as HTMLElement | null;
                        if (target?.closest("a,button,[data-stop-row-click='true']")) return;
                        startNav();
                        router.push(href);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          startNav();
                          router.push(href);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-[var(--accent)]/10 flex h-9 w-9 items-center justify-center rounded-xl text-[var(--accent)]">
                            <span className="material-symbols-outlined text-[20px]">
                              request_quote
                            </span>
                          </span>
                          <span className="font-jakarta text-base font-semibold text-[var(--label)] transition group-hover:text-[var(--accent)]">
                            {inv.invoiceNumber}
                          </span>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="pl-11 text-sm text-[var(--label-secondary)]">
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

                        <div
                          className="flex flex-wrap items-center gap-2"
                          data-stop-row-click="true"
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDownloadPdf(inv.id);
                            }}
                            disabled={downloadingId === inv.id}
                            className="inline-flex h-9 items-center rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 text-sm font-medium text-[var(--label)] transition hover:bg-[var(--fill-secondary)] disabled:opacity-60"
                          >
                            {downloadingId === inv.id ? tp("downloadingPdf") : tp("downloadPdf")}
                          </button>
                          <Link
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                            className={cn(
                              "inline-flex h-9 items-center gap-1 rounded-xl px-4 text-sm font-semibold transition hover:-translate-y-0.5",
                              showDue
                                ? "bg-[var(--accent)] text-white hover:shadow-md"
                                : "border border-[var(--separator)] text-[var(--label)] hover:bg-[var(--fill-secondary)]",
                            )}
                          >
                            {showDue ? tc("payInvoice") : tp("viewInvoice")}
                            <span className="material-symbols-outlined text-[16px]">
                              chevron_right
                            </span>
                          </Link>
                        </div>
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
