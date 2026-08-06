"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DataTable,
  EmptyState,
  LoadingSkeletonList,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listOrders, type Order } from "@/features/orders";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/i18n/format";

export default function OrdersPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.orders");
  const tt = useTranslations("ui.table");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.orders") },
        ]}
        actions={
          <Link href="/dashboard/cart" className="dashboard-btn-secondary">
            {t("nav.cart")}
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState title={tp("empty")} actionLabel={t("nav.cart")} actionHref="/dashboard/cart" />
      ) : (
        <DataTable
          data={orders as unknown as Record<string, unknown>[]}
          getRowKey={(row) => String(row.id)}
          getRowHref={(row) => `/dashboard/orders/${String(row.id)}`}
          columns={[
            {
              key: "id",
              header: "Order",
              render: (row) => {
                const o = row as unknown as Order;
                return (
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent)]">
                    <span className="bg-[var(--accent)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)]">
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    </span>
                    #{o.id.slice(-8)}
                  </span>
                );
              },
            },
            {
              key: "createdAt",
              header: tt("date"),
              sortable: true,
              render: (row) => new Date((row as unknown as Order).createdAt).toLocaleString(),
            },
            {
              key: "items",
              header: "Items",
              render: (row) => `${(row as unknown as Order).items.length} item(s)`,
            },
            {
              key: "total",
              header: tt("amount"),
              sortable: true,
              render: (row) => {
                const o = row as unknown as Order;
                return formatMoney(o.total, o.currency, locale);
              },
            },
            {
              key: "status",
              header: tt("status"),
              render: (row) => <StatusBadge status={(row as unknown as Order).status} />,
            },
            {
              key: "invoice",
              header: tt("invoice"),
              stopRowClick: true,
              render: (row) => {
                const inv = (row as unknown as Order).invoice;
                if (!inv) return "—";
                if (inv.status === "OPEN") {
                  return (
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                      data-stop-row-click="true"
                    >
                      Pay {inv.invoiceNumber}
                    </Link>
                  );
                }
                return inv.invoiceNumber;
              },
            },
          ]}
        />
      )}
    </div>
  );
}
