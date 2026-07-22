"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { listAdminOrders, type AdminOrder } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate, formatMoney } from "@/lib/i18n/format";

const STATUS_FILTERS = [
  { value: "", key: "all" },
  { value: "PENDING", key: "pending" },
  { value: "PROCESSING", key: "processing" },
  { value: "COMPLETED", key: "completed" },
  { value: "CANCELLED", key: "cancelled" },
] as const;

export default function AdminOrdersPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.orders");
  const tPay = useTranslations("admin.pages.payments");
  const tu = useTranslations("ui");
  const tf = useTranslations("ui.filters");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    listAdminOrders({
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
      />

      <div className="card-3d flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:text-primary"
              }`}
            >
              {tf(f.key)}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPay("searchPlaceholder")}
            className="h-10 min-w-[220px] rounded-xl border border-outline-variant px-4 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-xl bg-surface-container-low px-4 text-sm font-medium text-primary"
          >
            {t("actions.search")}
          </button>
        </form>
      </div>

      <DataTable
        data={orders as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "id",
            header: "Order",
            render: (row) => {
              const o = row as unknown as AdminOrder;
              return (
                <Link href={`/t4abriz/panel/orders/${o.id}`} className="font-medium text-secondary hover:underline">
                  #{o.id.slice(-8)}
                </Link>
              );
            },
          },
          {
            key: "customer",
            header: tu("table.customer"),
            sortable: true,
            render: (row) => (row as unknown as AdminOrder).customer.email,
          },
          {
            key: "total",
            header: tu("table.amount"),
            sortable: true,
            render: (row) => {
              const o = row as unknown as AdminOrder;
              return formatMoney(o.total, o.currency, locale);
            },
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => <StatusBadge status={(row as unknown as AdminOrder).status} />,
          },
          {
            key: "createdAt",
            header: tu("table.date"),
            sortable: true,
            render: (row) => formatDate((row as unknown as AdminOrder).createdAt, locale),
          },
        ]}
      />
    </div>
  );
}
