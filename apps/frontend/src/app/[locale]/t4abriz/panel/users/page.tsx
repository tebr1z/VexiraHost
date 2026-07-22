"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { DataTable, PageHeader } from "@/components/ui";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { listAdminUsers, type AdminUser } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatDate } from "@/lib/i18n/format";

export default function AdminUsersPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.users");
  const tu = useTranslations("ui");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listAdminUsers()
      .then(setUsers)
      .catch(() => setError(tp("adminOnly")))
      .finally(() => setLoading(false));
  }, [tp]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUserUpdated = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

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

      {error && <p className="text-error">{error}</p>}

      <DataTable
        data={users as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "email",
            header: "User",
            sortable: true,
            render: (row) => {
              const u = row as unknown as AdminUser;
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
              return (
                <div>
                  <p className="font-medium">{u.email}</p>
                  {name && <p className="text-xs text-on-surface-variant">{name}</p>}
                </div>
              );
            },
          },
          { key: "orderCount", header: "Orders", sortable: true },
          { key: "ticketCount", header: "Tickets", sortable: true },
          {
            key: "preferredCurrency",
            header: tp("currency"),
            render: (row) => {
              const u = row as unknown as AdminUser;
              return (
                <span className="text-sm text-on-surface-variant">
                  {u.preferredCurrency ?? "—"}
                  {u.currencyLocked ? ` (${tp("locked")})` : ""}
                </span>
              );
            },
          },
          {
            key: "createdAt",
            header: tu("table.date"),
            sortable: true,
            render: (row) => formatDate((row as unknown as AdminUser).createdAt, locale),
          },
          {
            key: "actions",
            header: tu("table.actions"),
            render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/t4abriz/panel/users/${(row as unknown as AdminUser).id}`}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium hover:bg-surface-container-low"
                >
                  {tu("view")}
                </Link>
                <AdminUserActions
                  user={row as unknown as AdminUser}
                  onUpdated={handleUserUpdated}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
