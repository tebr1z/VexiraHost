"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { listAdminInvoices, type AdminInvoice } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate, formatMoney } from "@/lib/i18n/format";

export default function AdminInvoicesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.invoices");
  const tu = useTranslations("ui");
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAdminInvoices()
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, []);

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

      <DataTable
        data={invoices as unknown as Record<string, unknown>[]}
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
            render: (row) => (row as unknown as AdminInvoice).customer.email,
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
                <Link href={`/t4abriz/panel/orders/${inv.orderId}`} className="text-secondary hover:underline">
                  #{inv.orderId.slice(-8)}
                </Link>
              );
            },
          },
        ]}
      />
    </div>
  );
}
