"use client";

import { useTranslations } from "next-intl";

import { InvoicePaymentHistory } from "@/components/billing/invoice-payment-history";
import { BrandLogo } from "@/components/brand/brand-logo";
import { StatusBadge } from "@/components/ui";
import type { InvoiceDetail } from "@/features/billing";
import { useDisplayMoney } from "@/hooks/use-display-money";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";

export function InvoiceDocument({
  invoice,
  locale,
  className,
  actions,
}: {
  invoice: InvoiceDetail;
  locale: string;
  className?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.invoices");
  const { format: formatDisplay } = useDisplayMoney();
  const currency = invoice.currency || "USD";

  const amountDue =
    invoice.amountDue ??
    (invoice.status === "PAID" || invoice.status === "VOID"
      ? 0
      : Math.max(0, invoice.total - (invoice.amountPaid ?? 0)));

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--separator)] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <BrandLogo href="/" variant="icon" />
          <div>
            <p className="text-sm text-[var(--label-secondary)]">{tp("companyTagline")}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
              {tp("documentTitle")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-jakarta text-xl font-bold text-[var(--label)]">
            {invoice.invoiceNumber}
          </p>
          <div className="mt-2 flex justify-end">
            <StatusBadge status={invoice.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-[var(--separator)] bg-[var(--fill-secondary)] px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <MetaItem label={tp("issuedOn")} value={formatDate(invoice.createdAt, locale)} />
        <MetaItem label={tp("dueDate")} value={formatDate(invoice.dueDate, locale)} />
        <MetaItem
          label={tp("paidOn")}
          value={invoice.paidAt ? formatDate(invoice.paidAt, locale) : "—"}
        />
        <MetaItem
          label={tp("linkedOrder")}
          value={
            invoice.order ? (
              <Link
                href={`/dashboard/orders/${invoice.order.id}`}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                #{invoice.order.id.slice(-8)}
              </Link>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div className="px-5 py-5 sm:px-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
          {tp("lineItems")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--separator)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[var(--fill-secondary)] text-xs font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
              <tr>
                <th className="px-4 py-3">{tp("description")}</th>
                <th className="px-4 py-3 text-center">{tp("qty")}</th>
                <th className="px-4 py-3 text-right">{tp("unitPrice")}</th>
                <th className="px-4 py-3 text-right">{tc("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--separator)]">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-[var(--label)]">{item.description}</td>
                  <td className="px-4 py-3 text-center text-[var(--label-secondary)]">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--label-secondary)]">
                    {formatDisplay(item.unitPrice, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--label)]">
                    {formatDisplay(item.totalPrice, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-[var(--label-secondary)]">
              <dt>{tc("subtotal")}</dt>
              <dd className="tabular-nums">{formatDisplay(invoice.subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between text-[var(--label-secondary)]">
              <dt>{tc("total")}</dt>
              <dd className="tabular-nums">{formatDisplay(invoice.total, currency)}</dd>
            </div>
            {(invoice.amountPaid ?? 0) > 0 ? (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <dt>{tc("amountPaid")}</dt>
                <dd className="tabular-nums">
                  -{formatDisplay(invoice.amountPaid ?? 0, currency)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-[var(--separator)] pt-2 text-base font-bold text-[var(--label)]">
              <dt>{tc("amountDue")}</dt>
              <dd className="tabular-nums">{formatDisplay(amountDue, currency)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <InvoicePaymentHistory payments={invoice.payments} currency={currency} locale={locale} />
      )}

      {actions && (
        <div className="flex flex-col gap-3 border-t border-[var(--separator)] px-5 py-5 sm:flex-row sm:px-6">
          {actions}
        </div>
      )}
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--label)]">{value}</p>
    </div>
  );
}
