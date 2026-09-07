"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { listAdminInvoices, markAdminInvoicePaid, type AdminInvoice } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

export default function AdminInvoicesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.invoices");
  const tu = useTranslations("ui");
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unpaid">("unpaid");

  const load = useCallback(async () => {
    const rows = await listAdminInvoices();
    setInvoices(rows);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => toast(getApiErrorMessage(err, tp("loadFailed")), "error"))
      .finally(() => setLoading(false));
  }, [load, tp]);

  const visible = useMemo(() => {
    if (filter === "unpaid") {
      return invoices.filter((inv) => inv.status === "OPEN" || inv.status === "OVERDUE");
    }
    return invoices;
  }, [filter, invoices]);

  const handleMarkPaid = async (invoice: AdminInvoice) => {
    if (!confirm(tp("markPaidConfirm", { number: invoice.invoiceNumber }))) return;
    setBusyId(invoice.id);
    try {
      await markAdminInvoicePaid(invoice.id);
      toast(tp("markedPaid"), "success");
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, tp("markPaidFailed")), "error");
    } finally {
      setBusyId(null);
    }
  };

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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("unpaid")}
          className={
            filter === "unpaid"
              ? "bg-primary text-on-primary rounded-xl px-3 py-1.5 text-xs font-semibold"
              : "border-outline-variant/40 rounded-xl border px-3 py-1.5 text-xs font-semibold"
          }
        >
          {tp("filterUnpaid")}
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={
            filter === "all"
              ? "bg-primary text-on-primary rounded-xl px-3 py-1.5 text-xs font-semibold"
              : "border-outline-variant/40 rounded-xl border px-3 py-1.5 text-xs font-semibold"
          }
        >
          {tp("filterAll")}
        </button>
      </div>

      <DataTable
        data={visible as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "invoiceNumber",
            header: tu("table.invoice"),
            sortable: true,
            render: (row) => (row as unknown as AdminInvoice).invoiceNumber,
          },
          {
            key: "customer",
            header: tu("table.customer"),
            sortable: true,
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              return (
                <Link
                  href={`/t4abriz/panel/users/${inv.customer.id}`}
                  className="text-secondary hover:underline"
                >
                  {inv.customer.email}
                </Link>
              );
            },
          },
          {
            key: "service",
            header: tp("service"),
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              return inv.hostingDomain || inv.domainName || "—";
            },
          },
          {
            key: "total",
            header: tu("table.amount"),
            sortable: true,
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              return formatMoney(inv.total, inv.currency, locale);
            },
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => <StatusBadge status={(row as unknown as AdminInvoice).status} />,
          },
          {
            key: "dueDate",
            header: tu("table.date"),
            sortable: true,
            render: (row) => formatDate((row as unknown as AdminInvoice).dueDate, locale),
          },
          {
            key: "orderId",
            header: tu("table.order"),
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              if (!inv.orderId) return "—";
              return (
                <Link
                  href={`/t4abriz/panel/orders/${inv.orderId}`}
                  className="text-secondary hover:underline"
                >
                  #{inv.orderId.slice(-8)}
                </Link>
              );
            },
          },
          {
            key: "actions",
            header: tu("table.actions"),
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              const unpaid = inv.status === "OPEN" || inv.status === "OVERDUE";
              if (!unpaid) return "—";
              return (
                <button
                  type="button"
                  disabled={busyId === inv.id}
                  onClick={() => void handleMarkPaid(inv)}
                  className="bg-primary text-on-primary rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
                >
                  {busyId === inv.id ? tp("markingPaid") : tp("markPaid")}
                </button>
              );
            },
          },
        ]}
      />
    </div>
  );
}
