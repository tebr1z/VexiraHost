"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui";
import { useDisplayMoney } from "@/hooks/use-display-money";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/i18n/format";

const DEFAULT_VISIBLE = 5;

type PaymentRow = {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
};

function countByStatus(payments: PaymentRow[]) {
  let failed = 0;
  let pending = 0;
  let succeeded = 0;

  for (const payment of payments) {
    const status = payment.status.toUpperCase();
    if (status === "FAILED") failed += 1;
    else if (status === "PENDING" || status === "PROCESSING") pending += 1;
    else if (status === "COMPLETED" || status === "SUCCEEDED" || status === "PAID") succeeded += 1;
  }

  return { failed, pending, succeeded, total: payments.length };
}

export function InvoicePaymentHistory({
  payments,
  currency,
  locale,
}: {
  payments: PaymentRow[];
  currency: string;
  locale: string;
}): React.ReactElement | null {
  const tp = useTranslations("dashboard.pages.invoices");
  const { format: formatDisplay } = useDisplayMoney();
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => [...payments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [payments],
  );

  const counts = useMemo(() => countByStatus(sorted), [sorted]);
  const hasMore = sorted.length > DEFAULT_VISIBLE;
  const visible = expanded || !hasMore ? sorted : sorted.slice(0, DEFAULT_VISIBLE);

  if (sorted.length === 0) return null;

  return (
    <div className="border-t border-[var(--separator)] bg-[var(--fill-secondary)] px-5 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
            {tp("paymentHistory")}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--label-secondary)]">
            {tp("paymentHistorySummary", {
              total: counts.total,
              failed: counts.failed,
              pending: counts.pending,
              succeeded: counts.succeeded,
            })}
          </p>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {expanded
              ? tp("paymentHistoryShowLess")
              : tp("paymentHistoryShowAll", { count: sorted.length })}
          </button>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-lg border border-[var(--separator)] bg-[var(--bg-elevated)]",
          !expanded && hasMore && "max-h-[220px]",
        )}
      >
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="sticky top-0 bg-[var(--fill-secondary)] text-[11px] font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
            <tr>
              <th className="px-3 py-2 sm:px-4">{tp("paymentHistoryDate")}</th>
              <th className="px-3 py-2 sm:px-4">{tp("paymentHistoryStatus")}</th>
              <th className="px-3 py-2 text-right sm:px-4">{tp("paymentHistoryAmount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--separator)]">
            {visible.map((payment) => (
              <tr key={payment.id} className="hover:bg-[var(--fill-secondary)]">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[var(--label-secondary)] sm:px-4">
                  {formatDateTime(payment.createdAt, locale)}
                </td>
                <td className="px-3 py-2 sm:px-4">
                  <StatusBadge status={payment.status} className="!px-2 !py-0.5 !text-[11px]" />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-[var(--label)] sm:px-4">
                  {formatDisplay(payment.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!expanded && hasMore && (
        <p className="mt-2 text-center text-[11px] text-[var(--label-secondary)]">
          {tp("paymentHistoryHidden", { count: sorted.length - DEFAULT_VISIBLE })}
        </p>
      )}
    </div>
  );
}
