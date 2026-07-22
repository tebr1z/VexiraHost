"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { DashboardOverviewStat } from "@/components/dashboard/dashboard-overview-stat";
import { MaterialIcon } from "@/components/landing/material-icon";
import { LoadingSkeleton } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listAddons } from "@/features/addons";
import { listInvoices } from "@/features/billing";
import { listDomains } from "@/features/domains";
import { listHostingAccounts } from "@/features/hosting";
import { listServers } from "@/features/servers";
import { listTickets } from "@/features/tickets";
import { useAuthStore } from "@/stores/auth-store";

interface OverviewCounts {
  services: number;
  domains: number;
  tickets: number;
  invoices: number;
}

export default function DashboardPage(): React.ReactElement | null {
  const th = useTranslations("dashboard.home");
  const to = useTranslations("dashboard.overview");
  const { isReady } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const [counts, setCounts] = useState<OverviewCounts | null>(null);

  const quickActions = useMemo(
    () => [
      { href: "/dashboard/products", label: to("buyService"), icon: "add_shopping_cart", accent: "blue" as const },
      { href: "/dashboard/domains", label: to("manageDomains"), icon: "language", accent: "green" as const },
      { href: "/dashboard/invoices", label: to("viewInvoices"), icon: "request_quote", accent: "green" as const },
      { href: "/dashboard/tickets", label: to("openTicket"), icon: "support_agent", accent: "blue" as const },
      { href: "/dashboard/orders", label: to("viewOrders"), icon: "receipt_long", accent: "blue" as const },
      { href: "/dashboard/account", label: to("myAccount"), icon: "person", accent: "green" as const },
    ],
    [to],
  );

  useEffect(() => {
    if (!isReady || !user) return;

    Promise.all([
      listHostingAccounts().catch(() => []),
      listServers().catch(() => []),
      listAddons().catch(() => []),
      listDomains().catch(() => []),
      listTickets().catch(() => []),
      listInvoices().catch(() => []),
    ]).then(([hosting, servers, addons, domains, tickets, invoices]) => {
      setCounts({
        services: hosting.length + servers.length + addons.length,
        domains: domains.length,
        tickets: tickets.length,
        invoices: invoices.length,
      });
    });
  }, [isReady, user]);

  if (!isReady || !user) {
    return (
      <div className="space-y-8" aria-busy>
        <div className="space-y-2">
          <LoadingSkeleton className="h-9 w-64" />
          <LoadingSkeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const welcome = user.firstName
    ? th("welcome", { firstName: `, ${user.firstName}` })
    : th("welcomeNoName");

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-5 py-6 sm:px-8">
        <h1 className="font-jakarta text-2xl font-bold text-[var(--label-primary)] sm:text-3xl">
          {th("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--label-secondary)]">{welcome}</p>
        <p className="mt-1 text-sm text-[var(--label-tertiary)]">{to("subtitle")}</p>
      </section>

      <section aria-label={to("sectionTitle")}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--label-primary)]">{to("sectionTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardOverviewStat
            href="/dashboard/hosting"
            label={to("services")}
            value={counts?.services ?? 0}
            icon="bookmarks"
            accent="blue"
            active
          />
          <DashboardOverviewStat
            href="/dashboard/domains"
            label={to("domains")}
            value={counts?.domains ?? 0}
            icon="language"
            accent="green"
          />
          <DashboardOverviewStat
            href="/dashboard/tickets"
            label={to("supportTickets")}
            value={counts?.tickets ?? 0}
            icon="headset_mic"
            accent="blue"
          />
          <DashboardOverviewStat
            href="/dashboard/invoices"
            label={to("invoices")}
            value={counts?.invoices ?? 0}
            icon="credit_card"
            accent="green"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--label-primary)]">{to("quickActionsTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 transition hover:border-[var(--accent)]/30 hover:shadow-sm"
            >
              <MaterialIcon
                name={action.icon}
                className={`text-[28px] ${
                  action.accent === "blue" ? "text-[var(--accent)]" : "text-emerald-600 dark:text-emerald-400"
                }`}
              />
              <span className="font-medium text-[var(--label-primary)]">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
