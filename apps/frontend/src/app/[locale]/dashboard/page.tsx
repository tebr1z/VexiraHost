"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DashboardOverviewStat } from "@/components/dashboard/dashboard-overview-stat";
import { LoadingSkeleton, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { getAccountBalance, listInvoices } from "@/features/billing";
import { listDomains } from "@/features/domains";
import { listHostingAccounts } from "@/features/hosting";
import { listServers } from "@/features/servers";
import { listTickets } from "@/features/tickets";
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

function formatBalance(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function DashboardPage(): React.ReactElement | null {
  const th = useTranslations("dashboard.home");
  const to = useTranslations("dashboard.overview");
  const { isReady } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
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
    <div className="space-y-6">
      <PageHeader
        title={th("title")}
        description={welcome}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/products"
              className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
            >
              {to("buyService")}
            </Link>
            <Link
              href="/dashboard/tickets/new"
              className="border-outline-variant text-on-surface hover:bg-surface-container-low inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold"
            >
              {to("openTicket")}
            </Link>
          </div>
        }
      />

      {showAttention ? (
        <section
          aria-label={to("attentionTitle")}
          className="text-on-surface rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-amber-900 dark:text-amber-100">{to("attentionTitle")}</p>
          <ul className="text-on-surface-variant mt-1.5 space-y-1">
            {counts.unpaidInvoices > 0 ? (
              <li>
                <Link href="/dashboard/invoices" className="text-primary hover:underline">
                  {to("unpaidInvoicesHint", { count: counts.unpaidInvoices })}
                </Link>
              </li>
            ) : null}
            {counts.openTickets > 0 ? (
              <li>
                <Link href="/dashboard/tickets" className="text-primary hover:underline">
                  {to("openTicketsHint", { count: counts.openTickets })}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section aria-label={to("sectionTitle")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {counts ? (
            <>
              <DashboardOverviewStat
                href="/dashboard/invoices"
                label={to("balance")}
                value={formatBalance(counts.balance, counts.balanceCurrency)}
                icon="account_balance_wallet"
                accent="emerald"
              />
              <DashboardOverviewStat
                href="/dashboard/hosting"
                label={to("hosting")}
                value={counts.hosting}
                icon="dns"
                accent="blue"
              />
              <DashboardOverviewStat
                href="/dashboard/domains"
                label={to("domains")}
                value={counts.domains}
                icon="language"
                accent="violet"
              />
              <DashboardOverviewStat
                href="/dashboard/servers"
                label={to("servers")}
                value={counts.servers}
                icon="cloud"
                accent="cyan"
              />
              <DashboardOverviewStat
                href="/dashboard/invoices"
                label={to("unpaidInvoices")}
                value={counts.unpaidInvoices}
                icon="request_quote"
                accent="amber"
              />
            </>
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
