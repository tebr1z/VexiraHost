"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { listAdminPayments, type AdminPayment } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate, formatMoney } from "@/lib/i18n/format";

const STATUS_FILTERS = [
  { value: "", key: "all" },
  { value: "PENDING", key: "pending" },
  { value: "COMPLETED", key: "completed" },
  { value: "FAILED", key: "failed" },
  { value: "REFUNDED", key: "refunded" },
] as const;

export default function AdminPaymentsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.payments");
  const tu = useTranslations("ui");
  const tf = useTranslations("ui.filters");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    listAdminPayments({
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then(setPayments)
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
            placeholder={tp("searchPlaceholder")}
            className="h-10 min-w-[220px] rounded-xl border border-outline-variant/40 bg-surface px-4 text-sm"
          />
          <button type="submit" className="h-10 rounded-xl bg-secondary px-4 text-sm font-medium text-on-secondary">
            {t("actions.search")}
          </button>
        </form>
      </div>

      <DataTable
        data={payments as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "createdAt",
            header: tu("table.date"),
            sortable: true,
            render: (row) => formatDate((row as unknown as AdminPayment).createdAt, locale),
          },
          {
            key: "customer",
            header: tu("table.customer"),
            render: (row) => (row as unknown as AdminPayment).customer.email,
          },
          {
            key: "invoice",
            header: tu("table.invoice"),
            render: (row) => (row as unknown as AdminPayment).invoice.invoiceNumber,
          },
          {
            key: "amount",
            header: tu("table.amount"),
            render: (row) => {
              const p = row as unknown as AdminPayment;
              return formatMoney(p.amount, p.currency, locale);
            },
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => <StatusBadge status={(row as unknown as AdminPayment).status} />,
          },
          {
            key: "method",
            header: tu("table.method"),
            render: (row) => {
              const m = (row as unknown as AdminPayment).method;
              if (!m) return "—";
              return m.last4 ? `${m.brand ?? m.label} •••• ${m.last4}` : m.label;
            },
          },
          {
            key: "gatewayRef",
            header: tu("table.gatewayRef"),
            render: (row) => (row as unknown as AdminPayment).gatewayRef ?? "—",
          },
        ]}
      />
    </div>
  );
}
