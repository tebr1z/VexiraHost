"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui";
import {
  deliverAdminLicense,
  fulfillAdminOrder,
  getAdminOrder,
  type AdminOrderDetail,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
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
  const [licenseKeys, setLicenseKeys] = useState<Record<string, string>>({});
  const [sendingItemId, setSendingItemId] = useState<string | null>(null);

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

  const handleDeliverLicense = async (orderItemId: string) => {
    const licenseKey = (licenseKeys[orderItemId] ?? "").trim();
    if (!licenseKey) {
      toast(tp("licenseKeyRequired"), "error");
      return;
    }
    setSendingItemId(orderItemId);
    try {
      const updated = await deliverAdminLicense(id, { orderItemId, licenseKey });
      setOrder(updated);
      setLicenseKeys((prev) => ({ ...prev, [orderItemId]: "" }));
      toast(tp("licenseSent"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("licenseSendFailed")), "error");
    } finally {
      setSendingItemId(null);
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

  const customerName = [order.customer.firstName, order.customer.lastName]
    .filter(Boolean)
    .join(" ");
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
              <label className="text-on-surface-variant flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alreadyDeployed}
                  onChange={(e) => setAlreadyDeployed(e.target.checked)}
                  className="border-outline-variant size-4 rounded"
                />
                {ta("actions.alreadyDeployed")}
              </label>
              <button
                type="button"
                onClick={handleFulfill}
                disabled={fulfilling}
                className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
              >
                {fulfilling ? tc("provisioning") : ta("actions.runProvisioning")}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
        <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <p className="text-on-surface-variant text-sm">{tc("customer")}</p>
          <p className="mt-2 font-medium">{order.customer.email}</p>
          {customerName && <p className="text-on-surface-variant text-sm">{customerName}</p>}
        </div>
      </div>

      <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
        <h2 className="text-primary mb-4 font-semibold">{tc("lineItems")}</h2>
        <ul className="divide-outline-variant/30 divide-y">
          {order.items.map((item) => {
            const meta = item.metadata as { primaryDomain?: string } | null;
            const isLicense = item.productCategory === "LICENSE" || item.deliveryMode === "MANUAL";
            const canSend =
              item.deliveryMode === "MANUAL" &&
              (!item.licenseDelivery ||
                item.licenseDelivery.pendingManualDelivery ||
                item.licenseDelivery.status === "PROVISIONING");
            const delivered =
              Boolean(item.licenseDelivery) &&
              !item.licenseDelivery?.pendingManualDelivery &&
              item.licenseDelivery?.status === "ACTIVE";

            return (
              <li key={item.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.productCategory && (
                      <p className="text-on-surface-variant text-xs">{item.productCategory}</p>
                    )}
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
                </div>

                {isAdmin && isLicense && item.deliveryMode === "MANUAL" && (
                  <div className="border-outline-variant/50 bg-surface-container-low/50 rounded-xl border p-4">
                    {delivered ? (
                      <div className="space-y-1 text-sm">
                        <p className="text-primary font-medium">{tp("licenseDelivered")}</p>
                        {item.licenseDelivery?.licenseKey && (
                          <p className="text-on-surface-variant font-mono">
                            {item.licenseDelivery.licenseKey}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">{tp("manualLicenseTitle")}</p>
                        <p className="text-on-surface-variant text-xs">{tp("manualLicenseHint")}</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={licenseKeys[item.id] ?? ""}
                            onChange={(e) =>
                              setLicenseKeys((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder={tp("licenseKeyPlaceholder")}
                            className="border-outline-variant h-11 flex-1 rounded-xl border px-3 text-sm"
                          />
                          <button
                            type="button"
                            disabled={sendingItemId === item.id || !canSend}
                            onClick={() => void handleDeliverLicense(item.id)}
                            className="bg-primary text-on-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
                          >
                            {sendingItemId === item.id ? tp("sendingLicense") : tp("sendLicense")}
                          </button>
                        </div>
                        {!item.licenseDelivery && (
                          <p className="text-on-surface-variant text-xs">
                            {tp("awaitingFulfillHint")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {order.hostingAccounts.length > 0 && (
        <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <h2 className="text-primary mb-4 font-semibold">{tc("hostingProvisioning")}</h2>
          <ul className="space-y-3">
            {order.hostingAccounts.map((account) => (
              <li
                key={account.id}
                className="bg-surface-container-low flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-medium">{account.primaryDomain}</p>
                  {account.provisionedAt && (
                    <p className="text-on-surface-variant text-sm">
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
                      className="text-secondary text-sm hover:underline"
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
        <section className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <h2 className="text-primary mb-4 font-semibold">{tc("invoices")}</h2>
          <ul className="space-y-3">
            {order.invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="bg-surface-container-low flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-on-surface-variant text-sm">
                    {tc("due", { date: formatDate(invoice.dueDate, locale) })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={invoice.status} />
                  <span className="font-medium">
                    {formatMoney(invoice.total, order.currency, locale)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
