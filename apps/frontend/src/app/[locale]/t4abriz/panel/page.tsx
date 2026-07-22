"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { getAdminDashboard, type AdminRecentOrder, type AdminRecentTicket } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tu = useTranslations("ui");
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<{
    activeUsers: number;
    totalOrders: number;
    openInvoices: number;
    openTickets: number;
    totalRevenue: number;
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminRecentOrder[]>([]);
  const [recentTickets, setRecentTickets] = useState<AdminRecentTicket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    getAdminDashboard()
      .then((data) => {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setRecentTickets(data.recentTickets);
      })
      .catch(() => setError("Access denied or admin API unavailable"));
  }, []);

  const quickLinks = [
    ...(isAdmin
      ? [
          {
            href: "/t4abriz/panel/users" as const,
            titleKey: "users" as const,
            pageKey: "users" as const,
          },
          {
            href: "/t4abriz/panel/hosting/servers" as const,
            titleKey: "hostingServers" as const,
            pageKey: "hostingServers" as const,
          },
        ]
      : []),
    { href: "/t4abriz/panel/orders" as const, titleKey: "orders" as const, pageKey: "orders" as const },
    { href: "/t4abriz/panel/invoices" as const, titleKey: "invoices" as const, pageKey: "invoices" as const },
    { href: "/t4abriz/panel/tickets" as const, titleKey: "tickets" as const, pageKey: "tickets" as const },
    {
      href: "/t4abriz/panel/hosting/accounts" as const,
      titleKey: "hostingAccounts" as const,
      pageKey: "hostingAccounts" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("overview.title")}
        description={t("overview.description")}
        breadcrumbs={[{ label: t("breadcrumb.admin") }]}
      />

      {error && <p className="text-error">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            {
              label: t("overview.stats.users"),
              value: stats.activeUsers,
              href: isAdmin ? "/t4abriz/panel/users" : undefined,
            },
            { label: t("overview.stats.orders"), value: stats.totalOrders, href: "/t4abriz/panel/orders" },
            {
              label: t("overview.stats.openInvoices"),
              value: stats.openInvoices,
              href: "/t4abriz/panel/invoices",
            },
            {
              label: t("overview.stats.openTickets"),
              value: stats.openTickets,
              href: "/t4abriz/panel/tickets",
            },
            { label: t("overview.stats.revenue"), value: formatMoney(stats.totalRevenue, "USD", locale) },
          ].map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} className="block transition-opacity hover:opacity-90">
                <StatCard label={item.label} value={item.value} />
              </Link>
            ) : (
              <StatCard key={item.label} label={item.label} value={item.value} />
            ),
          )}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card-3d card-3d-hover rounded-2xl p-5"
          >
            <p className="font-semibold text-primary">{t(`nav.${card.titleKey}`)}</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t(`pages.${card.pageKey}.description`)}
            </p>
          </Link>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-jakarta text-xl font-semibold">{t("overview.recentOrders")}</h2>
            <Link href="/t4abriz/panel/orders" className="text-sm text-secondary hover:underline">
              {t("overview.viewAll")}
            </Link>
          </div>
          <DataTable
            data={recentOrders as unknown as Record<string, unknown>[]}
            emptyMessage={tu("noRecords")}
            getRowKey={(row) => String(row.id)}
            pageSize={5}
            columns={[
              {
                key: "id",
                header: "Order",
                render: (row) => {
                  const o = row as unknown as AdminRecentOrder;
                  return (
                    <Link href={`/t4abriz/panel/orders/${o.id}`} className="font-medium text-secondary hover:underline">
                      #{o.id.slice(-8)}
                    </Link>
                  );
                },
              },
              { key: "customerEmail", header: tu("table.customer"), sortable: true },
              {
                key: "total",
                header: tu("table.amount"),
                render: (row) => {
                  const o = row as unknown as AdminRecentOrder;
                  return formatMoney(o.total, o.currency, locale);
                },
              },
              {
                key: "status",
                header: tu("table.status"),
                render: (row) => <StatusBadge status={(row as unknown as AdminRecentOrder).status} />,
              },
            ]}
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-jakarta text-xl font-semibold">{t("overview.recentTickets")}</h2>
            <Link href="/t4abriz/panel/tickets" className="text-sm text-secondary hover:underline">
              {t("overview.viewAll")}
            </Link>
          </div>
          <DataTable
            data={recentTickets as unknown as Record<string, unknown>[]}
            emptyMessage={tu("noRecords")}
            getRowKey={(row) => String(row.id)}
            pageSize={5}
            columns={[
              {
                key: "subject",
                header: "Subject",
                sortable: true,
                render: (row) => {
                  const ticket = row as unknown as AdminRecentTicket;
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
              { key: "customerEmail", header: tu("table.customer") },
              {
                key: "priority",
                header: "Priority",
                render: (row) => (
                  <span className="capitalize">{(row as unknown as AdminRecentTicket).priority.toLowerCase()}</span>
                ),
              },
              {
                key: "status",
                header: tu("table.status"),
                render: (row) => <StatusBadge status={(row as unknown as AdminRecentTicket).status} />,
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
