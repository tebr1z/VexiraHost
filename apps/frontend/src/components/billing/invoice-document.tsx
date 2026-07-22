"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { InvoicePaymentHistory } from "@/components/billing/invoice-payment-history";
import { StatusBadge } from "@/components/ui";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { InvoiceDetail } from "@/features/billing";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { cn } from "@/lib/cn";

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

  return (
    <article className={cn("panel-card overflow-hidden rounded-lg", className)}>
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0060df] to-[#004bb5] px-6 py-5 text-white sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <BrandLogo href="/" variant="icon" tone="light" />
            <p className="mt-2 text-sm text-white/80">{tp("companyTagline")}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{tp("documentTitle")}</p>
            <p className="font-jakarta text-xl font-bold">{invoice.invoiceNumber}</p>
            <div className="mt-2 flex justify-end">
              <StatusBadge status={invoice.status} className="!border-white/30 !bg-white/15 !text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
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
              <Link href={`/dashboard/orders/${invoice.order.id}`} className="font-medium text-primary hover:underline">
                #{invoice.order.id.slice(-8)}
              </Link>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div className="px-6 py-5 sm:px-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          {tp("lineItems")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">{tp("description")}</th>
                <th className="px-4 py-3 text-center">{tp("qty")}</th>
                <th className="px-4 py-3 text-right">{tp("unitPrice")}</th>
                <th className="px-4 py-3 text-right">{tc("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-primary">{item.description}</td>
                  <td className="px-4 py-3 text-center text-on-surface-variant">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">
                    {formatMoney(item.unitPrice, invoice.currency, locale)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(item.totalPrice, invoice.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-on-surface-variant">
              <dt>{tc("subtotal")}</dt>
              <dd>{formatMoney(invoice.subtotal, invoice.currency, locale)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-primary">
              <dt>{tc("total")}</dt>
              <dd>{formatMoney(invoice.total, invoice.currency, locale)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <InvoicePaymentHistory
          payments={invoice.payments}
          currency={invoice.currency}
          locale={locale}
        />
      )}

      {actions && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:px-8">
          {actions}
        </div>
      )}
    </article>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-medium text-primary">{value}</p>
    </div>
  );
}
