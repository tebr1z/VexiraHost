"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui";
import { fulfillAdminOrder, getAdminOrder, type AdminOrderDetail } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminOrderDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.orders");
  const tc = useTranslations("dashboard.common");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [alreadyDeployed, setAlreadyDeployed] = useState(false);

  const load = () =>
    getAdminOrder(id)
      .then(setOrder)
      .catch(() => setError(tc("orderAccessDenied")));

  useEffect(() => {
    load();
  }, [id]);

  const handleFulfill = async () => {
    setFulfilling(true);
    try {
      const updated = await fulfillAdminOrder(id, { alreadyDeployed });
      setOrder(updated);
      toast(tt("provisioningTriggered"), "success");
    } catch {
      toast(tt("provisioningFailed"), "error");
    } finally {
      setFulfilling(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-error">{error}</p>
        <Link href="/t4abriz/panel/orders" className="text-secondary hover:underline">
          {tc("backToOrders")}
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="text-on-surface-variant">{tu("loading")}</p>;
  }

  const customerName = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ");
  const hasHostingItems = order.items.some((item) => {
    const meta = item.metadata as { primaryDomain?: string } | null;
    return Boolean(meta?.primaryDomain);
  });
  const shortId = order.id.slice(-8);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("detailTitle", { id: shortId })}
        description={tc("placed", { date: formatDate(order.createdAt, locale) })}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.orders"), href: "/t4abriz/panel/orders" },
          { label: `#${shortId}` },
        ]}
        actions={
          isAdmin && hasHostingItems ? (
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={alreadyDeployed}
                  onChange={(e) => setAlreadyDeployed(e.target.checked)}
                  className="size-4 rounded border-outline-variant"
                />
                {ta("actions.alreadyDeployed")}
              </label>
              <button
                type="button"
                onClick={handleFulfill}
                disabled={fulfilling}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-60"
              >
                {fulfilling ? tc("provisioning") : ta("actions.runProvisioning")}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
          <p className="text-sm text-on-surface-variant">{tc("status")}</p>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
          <p className="text-sm text-on-surface-variant">{tc("total")}</p>
          <p className="mt-2 text-xl font-bold">{formatMoney(order.total, order.currency, locale)}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
          <p className="text-sm text-on-surface-variant">{tc("customer")}</p>
          <p className="mt-2 font-medium">{order.customer.email}</p>
          {customerName && <p className="text-sm text-on-surface-variant">{customerName}</p>}
        </div>
      </div>

      <section className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
        <h2 className="mb-4 font-semibold text-primary">{tc("lineItems")}</h2>
        <ul className="divide-y divide-outline-variant/30">
          {order.items.map((item) => {
            const meta = item.metadata as { primaryDomain?: string } | null;
            return (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {meta?.primaryDomain && (
                    <p className="text-sm text-on-surface-variant">
                      {tc("domainLabel", { name: meta.primaryDomain })}
                    </p>
                  )}
                  <p className="text-sm text-on-surface-variant">{tc("qty", { count: item.quantity })}</p>
                </div>
                <p className="font-medium">{formatMoney(item.totalPrice, order.currency, locale)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {order.hostingAccounts.length > 0 && (
        <section className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
          <h2 className="mb-4 font-semibold text-primary">{tc("hostingProvisioning")}</h2>
          <ul className="space-y-3">
            {order.hostingAccounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3"
              >
                <div>
                  <p className="font-medium">{account.primaryDomain}</p>
                  {account.provisionedAt && (
                    <p className="text-sm text-on-surface-variant">
                      {tc("provisioned", { date: formatDate(account.provisionedAt, locale) })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={account.status} />
                  {account.panelUrl && (
                    <a
                      href={account.panelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-secondary hover:underline"
                    >
                      {tc("panelLink")}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.invoices.length > 0 && (
        <section className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
          <h2 className="mb-4 font-semibold text-primary">{tc("invoices")}</h2>
          <ul className="space-y-3">
            {order.invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3"
              >
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-on-surface-variant">
                    {tc("due", { date: formatDate(invoice.dueDate, locale) })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={invoice.status} />
                  <span className="font-medium">{formatMoney(invoice.total, order.currency, locale)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
