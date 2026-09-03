"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { DataTable, EditIconLink, PageHeader, StatusBadge, TableRowActions } from "@/components/ui";
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
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminUsers({ q: search || undefined })
      .then(setUsers)
      .catch(() => setError(tp("adminOnly")))
      .finally(() => setLoading(false));
  }, [search, tp]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUserUpdated = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const handleUserDeleted = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
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

      <div className="card-3d flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-end">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tp("searchPlaceholder")}
            className="border-outline-variant h-10 min-w-[220px] rounded-xl border px-4 text-sm"
          />
          <button
            type="submit"
            className="bg-surface-container-low text-primary h-10 rounded-xl px-4 text-sm font-medium"
          >
            {t("actions.search")}
          </button>
        </form>
      </div>

      {error && <p className="text-error">{error}</p>}

      <DataTable
        data={users as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "email",
            header: tp("colUser"),
            sortable: true,
            render: (row) => {
              const u = row as unknown as AdminUser;
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
              return (
                <div>
                  <p className="font-medium">{u.email}</p>
                  {name && <p className="text-on-surface-variant text-xs">{name}</p>}
                </div>
              );
            },
          },
          {
            key: "role",
            header: tp("colRole"),
            sortable: true,
            render: (row) => {
              const u = row as unknown as AdminUser;
              return (
                <span className="bg-surface-container-low rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                  {u.role}
                </span>
              );
            },
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => <StatusBadge status={(row as unknown as AdminUser).status} />,
          },
          {
            key: "orderCount",
            header: tp("orders"),
            sortable: true,
          },
          {
            key: "ticketCount",
            header: tp("tickets"),
            sortable: true,
          },
          {
            key: "preferredCurrency",
            header: tp("currency"),
            render: (row) => {
              const u = row as unknown as AdminUser;
              return (
                <span className="text-on-surface-variant text-sm">
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
            render: (row) => {
              const u = row as unknown as AdminUser;
              return (
                <TableRowActions>
                  <EditIconLink href={`/t4abriz/panel/users/${u.id}`} label={tu("edit")} />
                  <AdminUserActions
                    user={u}
                    onUpdated={handleUserUpdated}
                    onDeleted={handleUserDeleted}
                  />
                </TableRowActions>
              );
            },
          },
        ]}
      />
    </div>
  );
}
