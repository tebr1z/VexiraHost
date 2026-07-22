"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { DataTable, EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listTickets, type Ticket } from "@/features/tickets";

const STATUS_FILTERS = [
  { value: "ALL", labelKey: "all" },
  { value: "OPEN", labelKey: "open" },
  { value: "IN_PROGRESS", labelKey: "inProgress" },
  { value: "WAITING_CUSTOMER", labelKey: "waiting" },
  { value: "CLOSED", labelKey: "closed" },
] as const;

export default function TicketsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.tickets");
  const tf = useTranslations("ui.filters");
  const tt = useTranslations("ui.table");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.support") },
        ]}
        actions={
          <Link
            href="/dashboard/tickets/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("newTitle")}
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:text-primary"
            }`}
          >
            {tf(f.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeletonList rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={statusFilter === "ALL" ? tp("empty") : tp("emptyFiltered")}
          actionLabel={tp("newTitle")}
          actionHref="/dashboard/tickets/new"
        />
      ) : (
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          getRowKey={(row) => String(row.id)}
          columns={[
            {
              key: "subject",
              header: "Subject",
              sortable: true,
              render: (row) => {
                const ticket = row as unknown as Ticket;
                return (
                  <Link href={`/dashboard/tickets/${ticket.id}`} className="font-medium text-secondary hover:underline">
                    {ticket.subject}
                  </Link>
                );
              },
            },
            {
              key: "priority",
              header: "Priority",
              render: (row) => (
                <span className="capitalize">{(row as unknown as Ticket).priority.toLowerCase()}</span>
              ),
            },
            {
              key: "status",
              header: tt("status"),
              render: (row) => <StatusBadge status={(row as unknown as Ticket).status} />,
            },
            {
              key: "updatedAt",
              header: tt("date"),
              sortable: true,
              render: (row) => new Date((row as unknown as Ticket).updatedAt).toLocaleString(),
            },
          ]}
        />
      )}
    </div>
  );
}
