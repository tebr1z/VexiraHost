"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ProvisionProgress } from "@/components/hosting/provision-progress";
import { LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { retryHostingProvision } from "@/features/hosting/services/hosting.service";
import { getOrder, type Order } from "@/features/orders";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

export default function OrderDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.orders");
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(() => {
    return getOrder(id)
      .then(setOrder)
      .catch(() => setError(tc("orderNotFound")))
      .finally(() => setLoading(false));
  }, [id, tc]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!order?.hostingAccounts.some((a) => a.status === "PROVISIONING" || a.status === "FAILED")) {
      return;
    }
    const timer = window.setInterval(() => {
      void getOrder(id)
        .then(setOrder)
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [order, id]);

  const onRetryProvision = async (accountId: string) => {
    setRetryingId(accountId);
    try {
      await retryHostingProvision(accountId);
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, tp("provisionRetryFailed")), "error");
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeletonList rows={3} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <p className="text-error">{error ?? tc("orderNotFound")}</p>
        <Link href="/dashboard/orders" className="text-secondary hover:underline">
          {tc("backToOrders")}
        </Link>
      </div>
    );
  }

  const shortId = order.id.slice(-8);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("detailTitle", { id: shortId })}
        description={tc("placed", { date: formatDate(order.createdAt, locale) })}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.orders"), href: "/dashboard/orders" },
          { label: `#${shortId}` },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <p className="text-on-surface-variant text-sm">{tc("status")}</p>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <p className="text-on-surface-variant text-sm">{tc("total")}</p>
          <p className="mt-2 text-xl font-bold">
            {formatMoney(order.total, order.currency, locale)}
          </p>
        </div>
      </div>

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <h2 className="text-primary mb-4 font-semibold">{tc("items")}</h2>
        <ul className="divide-outline-variant/30 divide-y">
          {order.items.map((item) => {
            const meta = item.metadata as { primaryDomain?: string } | null;
            return (
              <li key={item.id} className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {meta?.primaryDomain && (
                    <p className="text-on-surface-variant text-sm">
                      {tc("domainLabel", { name: meta.primaryDomain })}
                    </p>
                  )}
                  <p className="text-on-surface-variant text-sm">
                    {tc("qty", { count: item.quantity })}
                  </p>
                </div>
                <p className="font-medium">
                  {formatMoney(item.totalPrice, order.currency, locale)}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="border-outline-variant/30 mt-4 flex justify-between border-t pt-4 text-sm">
          <span className="text-on-surface-variant">{tc("subtotal")}</span>
          <span>{formatMoney(order.subtotal, order.currency, locale)}</span>
        </div>
      </section>

      {order.hostingAccounts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-primary font-semibold">{tc("hostingProvisioning")}</h2>
          {order.hostingAccounts.map((account) => (
            <div key={account.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <Link
                    href={`/dashboard/hosting/${account.id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {account.primaryDomain}
                  </Link>
                  {account.provisionedAt && (
                    <p className="text-on-surface-variant text-sm">
                      {tc("provisioned", { date: formatDate(account.provisionedAt, locale) })}
                    </p>
                  )}
                </div>
                <StatusBadge status={account.status} />
              </div>
              {(account.status === "PROVISIONING" || account.status === "FAILED") && (
                <ProvisionProgress
                  stage={account.provisionStage}
                  error={account.provisionError}
                  status={account.status}
                  onRetry={
                    account.status === "FAILED"
                      ? () => void onRetryProvision(account.id)
                      : undefined
                  }
                  retryLoading={retryingId === account.id}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {order.invoice && (
        <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <h2 className="text-primary mb-4 font-semibold">{tc("invoice")}</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{order.invoice.invoiceNumber}</p>
              <p className="text-on-surface-variant text-sm">
                {tc("due", { date: formatDate(order.invoice.dueDate, locale) })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.invoice.status} />
              <span className="font-medium">
                {formatMoney(order.invoice.total, order.currency, locale)}
              </span>
            </div>
          </div>
          {order.invoice.status === "OPEN" && (
            <Link
              href={`/dashboard/invoices/${order.invoice.id}`}
              className="bg-primary text-on-primary mt-4 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
            >
              {tc("payInvoice")}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
