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

function TicketTable({ rows }: { rows: Ticket[] }): React.ReactElement {
  const tt = useTranslations("ui.table");

  return (
    <DataTable
      data={rows as unknown as Record<string, unknown>[]}
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
                  <span className="material-symbols-outlined text-[18px]">
                    {ticket.kind === "CANCELLATION" ? "event_busy" : "support_agent"}
                  </span>
                </span>
                {ticket.subject}
              </span>
            );
          },
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
  );
}

export default function TicketsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.tickets");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

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

  const supportTickets = useMemo(
    () => tickets.filter((item) => item.kind !== "CANCELLATION"),
    [tickets],
  );
  const cancelTickets = useMemo(
    () => tickets.filter((item) => item.kind === "CANCELLATION"),
    [tickets],
  );

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

      {loading ? (
        <LoadingSkeletonList rows={4} />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--label-secondary)]">
              {tp("supportSection")}
            </h2>
            {supportTickets.length === 0 ? (
              <EmptyState
                title={tp("emptyFiltered")}
                actionLabel={tp("newTitle")}
                actionHref="/dashboard/tickets/new"
              />
            ) : (
              <TicketTable rows={supportTickets} />
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--label-secondary)]">
              {tp("cancelSection")}
            </h2>
            {cancelTickets.length === 0 ? (
              <p className="text-sm text-[var(--label-tertiary)]">{tp("emptyFiltered")}</p>
            ) : (
              <TicketTable rows={cancelTickets} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
