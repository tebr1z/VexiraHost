"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DataTable,
  EditIconLink,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableRowActions,
} from "@/components/ui";
import {
  deleteAdminCatalogCategory,
  listAdminCatalogCategories,
  type AdminCatalogCategory,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminCategoriesPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.categories");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [rows, setRows] = useState<AdminCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    listAdminCatalogCategories()
      .then(setRows)
      .finally(() => setLoading(false));

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return <p className="text-on-surface-variant">{tp("adminOnly")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
        actions={
          <Link
            href="/t4abriz/panel/categories/new"
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
          >
            {tp("add")}
          </Link>
        }
      />
      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "name",
            header: tp("colName"),
            sortable: true,
            render: (row) => {
              const cat = row as unknown as AdminCatalogCategory;
              return <span className="text-on-surface font-medium">{cat.name}</span>;
            },
          },
          {
            key: "slug",
            header: tp("colSlug"),
            render: (row) => (row as unknown as AdminCatalogCategory).slug,
          },
          {
            key: "systemType",
            header: tp("colSystemType"),
            render: (row) => (row as unknown as AdminCatalogCategory).systemType ?? "—",
          },
          {
            key: "productCount",
            header: tp("colProducts"),
            render: (row) => (row as unknown as AdminCatalogCategory).productCount,
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge
                status={(row as unknown as AdminCatalogCategory).isActive ? "ACTIVE" : "SUSPENDED"}
              />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const cat = row as unknown as AdminCatalogCategory;
              return (
                <TableRowActions>
                  <EditIconLink href={`/t4abriz/panel/categories/${cat.id}`} label={tu("edit")} />
                  <button
                    type="button"
                    className="text-error text-sm hover:underline"
                    onClick={async () => {
                      if (!confirm(`${t("actions.delete")} ${cat.name}?`)) return;
                      try {
                        await deleteAdminCatalogCategory(cat.id);
                        toast(tp("deleted"), "success");
                        load();
                      } catch {
                        toast(tp("deleteFailed"), "error");
                      }
                    }}
                  >
                    {t("actions.delete")}
                  </button>
                </TableRowActions>
              );
            },
          },
        ]}
      />
      {!loading && rows.length === 0 && (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("add")}
          actionHref="/t4abriz/panel/categories/new"
        />
      )}
    </div>
  );
}
