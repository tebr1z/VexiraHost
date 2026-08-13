"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DashboardOverviewStat } from "@/components/dashboard/dashboard-overview-stat";
import { LoadingSkeleton } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { getAccountBalance, listInvoices } from "@/features/billing";
import { listDomains } from "@/features/domains";
import { listHostingAccounts } from "@/features/hosting";
import { listServers } from "@/features/servers";
import { listTickets } from "@/features/tickets";
import { useDisplayMoney } from "@/hooks/use-display-money";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

const OPEN_TICKET_STATUSES = new Set(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"]);
const UNPAID_INVOICE_STATUSES = new Set(["OPEN", "OVERDUE"]);

interface OverviewCounts {
  hosting: number;
  domains: number;
  servers: number;
  unpaidInvoices: number;
  openTickets: number;
  balance: number;
  balanceCurrency: string;
}

export default function DashboardPage(): React.ReactElement | null {
  const th = useTranslations("dashboard.home");
  const to = useTranslations("dashboard.overview");
  const { isReady } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const { format: formatDisplay } = useDisplayMoney();
  const [counts, setCounts] = useState<OverviewCounts | null>(null);

  useEffect(() => {
    if (!isReady || !user) return;

    let cancelled = false;
    Promise.all([
      listHostingAccounts().catch(() => []),
      listServers().catch(() => []),
      listDomains().catch(() => []),
      listTickets().catch(() => []),
      listInvoices().catch(() => []),
      getAccountBalance().catch(() => ({ balance: 0, currency: "USD" })),
    ]).then(([hosting, servers, domains, tickets, invoices, balance]) => {
      if (cancelled) return;
      const hostingOnly = hosting.filter(
        (acc) => acc.managementMode !== "MANUAL" || acc.serviceCategory !== "SERVER",
      );
      const manualServers = hosting.filter(
        (acc) => acc.managementMode === "MANUAL" && acc.serviceCategory === "SERVER",
      );
      setCounts({
        hosting: hostingOnly.length,
        domains: domains.length,
        servers: servers.length + manualServers.length,
        unpaidInvoices: invoices.filter((inv) => UNPAID_INVOICE_STATUSES.has(inv.status)).length,
        openTickets: tickets.filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status)).length,
        balance: balance.balance,
        balanceCurrency: balance.currency || "USD",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  if (!isReady || !user) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="space-y-2">
          <LoadingSkeleton className="h-8 w-56" />
          <LoadingSkeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const welcome = user.firstName
    ? th("welcome", { firstName: `, ${user.firstName}` })
    : th("welcomeNoName");

  const showAttention = counts != null && (counts.unpaidInvoices > 0 || counts.openTickets > 0);

  return (
    <div className="space-y-8">
      <section className="dashboard-hero relative overflow-hidden rounded-3xl border border-[var(--separator)] px-5 py-7 shadow-sm sm:px-8 sm:py-9">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              {th("title")}
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{welcome}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
              {to("sectionTitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/products"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span className="material-symbols-outlined text-[19px]">add_circle</span>
              {to("buyService")}
            </Link>
            <Link
              href="/dashboard/tickets/new"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <span className="material-symbols-outlined text-[19px]">support_agent</span>
              {to("openTicket")}
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-cyan-300/15 blur-3xl" />
      </section>

      {showAttention ? (
        <section
          aria-label={to("attentionTitle")}
          className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:px-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <span className="material-symbols-outlined">priority_high</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              {to("attentionTitle")}
            </p>
            <div className="text-on-surface-variant mt-1 flex flex-wrap gap-x-5 gap-y-1">
              {counts.unpaidInvoices > 0 ? (
                <Link
                  href="/dashboard/invoices"
                  className="inline-flex items-center gap-1 font-medium text-amber-800 hover:underline dark:text-amber-200"
                >
                  {to("unpaidInvoicesHint", { count: counts.unpaidInvoices })}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              ) : null}
              {counts.openTickets > 0 ? (
                <Link
                  href="/dashboard/tickets"
                  className="inline-flex items-center gap-1 font-medium text-amber-800 hover:underline dark:text-amber-200"
                >
                  {to("openTicketsHint", { count: counts.openTickets })}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section aria-label={to("sectionTitle")}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--label-primary)]">
              {to("sectionTitle")}
            </h2>
            <div className="mt-1 h-1 w-10 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {counts ? (
            <>
              <DashboardOverviewStat
                href="/dashboard/invoices"
                label={to("balance")}
                value={formatDisplay(counts.balance, counts.balanceCurrency)}
                icon="account_balance_wallet"
                accent="emerald"
                delay={0.03}
              />
              <DashboardOverviewStat
                href="/dashboard/hosting"
                label={to("hosting")}
                value={counts.hosting}
                icon="dns"
                accent="blue"
                delay={0.07}
              />
              <DashboardOverviewStat
                href="/dashboard/domains"
                label={to("domains")}
                value={counts.domains}
                icon="language"
                accent="violet"
                delay={0.11}
              />
              <DashboardOverviewStat
                href="/dashboard/servers"
                label={to("servers")}
                value={counts.servers}
                icon="cloud"
                accent="cyan"
                delay={0.15}
              />
              <DashboardOverviewStat
                href="/dashboard/invoices"
                label={to("unpaidInvoices")}
                value={counts.unpaidInvoices}
                icon="request_quote"
                accent="amber"
                delay={0.19}
              />
              <DashboardOverviewStat
                href="/dashboard/tickets"
                label={to("openTickets")}
                value={counts.openTickets}
                icon="support_agent"
                accent="violet"
                delay={0.23}
              />
            </>
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
