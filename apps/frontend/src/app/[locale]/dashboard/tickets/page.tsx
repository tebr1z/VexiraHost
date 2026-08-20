"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  DataTable,
  EmptyState,
  LoadingSkeletonList,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listTickets, type Ticket } from "@/features/tickets";
import { Link } from "@/i18n/navigation";

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
    let cancelled = false;
    setLoading(true);
    listTickets()
      .then((rows) => {
        if (!cancelled) setTickets(rows);
      })
      .catch(() => {
        if (!cancelled) setTickets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.support") },
        ]}
        actions={
          <Link href="/dashboard/tickets/new" className="dashboard-btn-primary">
            {tp("newTitle")}
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-2 shadow-sm">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              statusFilter === f.value
                ? "shadow-[var(--accent)]/15 bg-[var(--accent)] text-white shadow-md"
                : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label-primary)]"
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
          getRowHref={(row) => `/dashboard/tickets/${String(row.id)}`}
          columns={[
            {
              key: "subject",
              header: "Subject",
              sortable: true,
              render: (row) => {
                const ticket = row as unknown as Ticket;
                return (
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--label-primary)] group-hover:text-[var(--accent)]">
                    <span className="bg-[var(--accent)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)]">
                      <span className="material-symbols-outlined text-[18px]">support_agent</span>
                    </span>
                    {ticket.subject}
                  </span>
                );
              },
            },
            {
              key: "priority",
              header: "Priority",
              render: (row) => (
                <span className="capitalize">
                  {(row as unknown as Ticket).priority.toLowerCase()}
                </span>
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
