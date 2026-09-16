"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { listAdminTickets, type AdminTicket } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";

function isCancellation(ticket: AdminTicket): boolean {
  return ticket.kind === "CANCELLATION";
}

export default function AdminTicketsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.tickets");
  const tu = useTranslations("ui");
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | "SUPPORT" | "CANCELLATION">("all");

  useEffect(() => {
    listAdminTickets()
      .then(setTickets)
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (kindFilter === "all") return tickets;
    return tickets.filter((ticket) => (ticket.kind ?? "SUPPORT") === kindFilter);
  }, [tickets, kindFilter]);

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
        {(
          [
            ["all", "filterAll"],
            ["SUPPORT", "filterSupport"],
            ["CANCELLATION", "filterCancellation"],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKindFilter(id)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-semibold",
              kindFilter === id
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--separator)] text-[var(--label-secondary)]",
            )}
          >
            {tp(key)}
          </button>
        ))}
      </div>

      <DataTable
        data={visible as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "kind",
            header: tp("kind"),
            render: (row) => {
              const ticket = row as unknown as AdminTicket;
              return (
                <span className="text-xs font-medium text-[var(--label-secondary)]">
                  {isCancellation(ticket) ? tp("kindCancellation") : tp("kindSupport")}
                </span>
              );
            },
          },
          {
            key: "subject",
            header: "Subject",
            sortable: true,
            render: (row) => {
              const ticket = row as unknown as AdminTicket;
              return (
                <Link
                  href={`/t4abriz/panel/tickets/${ticket.id}`}
                  className="text-secondary font-medium hover:underline"
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
              <span className="capitalize">
                {(row as unknown as AdminTicket).priority.toLowerCase()}
              </span>
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
