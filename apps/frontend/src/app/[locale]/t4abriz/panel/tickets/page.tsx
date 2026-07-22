"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { listAdminTickets, type AdminTicket } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate } from "@/lib/i18n/format";

export default function AdminTicketsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.tickets");
  const tu = useTranslations("ui");
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAdminTickets()
      .then(setTickets)
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
        data={tickets as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "subject",
            header: "Subject",
            sortable: true,
            render: (row) => {
              const ticket = row as unknown as AdminTicket;
              return (
                <Link
                  href={`/t4abriz/panel/tickets/${ticket.id}`}
                  className="font-medium text-secondary hover:underline"
                >
                  {ticket.subject}
                </Link>
              );
            },
          },
          {
            key: "customer",
            header: tu("table.customer"),
            sortable: true,
            render: (row) => (row as unknown as AdminTicket).customer.email,
          },
          {
            key: "priority",
            header: "Priority",
            render: (row) => (
              <span className="capitalize">{(row as unknown as AdminTicket).priority.toLowerCase()}</span>
            ),
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => <StatusBadge status={(row as unknown as AdminTicket).status} />,
          },
          { key: "messageCount", header: "Messages", sortable: true },
          {
            key: "updatedAt",
            header: tu("table.date"),
            sortable: true,
            render: (row) => formatDate((row as unknown as AdminTicket).updatedAt, locale),
          },
        ]}
      />
    </div>
  );
}
