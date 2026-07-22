"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { deleteAdminProduct, listAdminProducts, type AdminProduct } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminProductsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.products");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => listAdminProducts().then(setProducts).finally(() => setLoading(false));

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return <p className="text-on-surface-variant">Only administrators can manage products.</p>;

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
            href="/t4abriz/panel/products/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("add")}
          </Link>
        }
      />
      <DataTable
        data={products as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "name",
            header: "Product",
            sortable: true,
            render: (row) => {
              const p = row as unknown as AdminProduct;
              return (
                <Link href={`/t4abriz/panel/products/${p.id}`} className="font-medium text-secondary hover:underline">
                  {p.name}
                </Link>
              );
            },
          },
          {
            key: "slug",
            header: "Slug",
            render: (row) => (
              <span className="font-mono text-xs text-on-surface-variant">
                {(row as unknown as AdminProduct).slug}
              </span>
            ),
          },
          { key: "category", header: "Category", sortable: true },
          {
            key: "hostingPlanSlug",
            header: t("nav.hostingPlans"),
            render: (row) => (row as unknown as AdminProduct).hostingPlanSlug ?? "—",
          },
          {
            key: "price",
            header: tu("table.amount"),
            render: (row) => formatMoney((row as unknown as AdminProduct).price, "USD", locale),
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge status={(row as unknown as AdminProduct).isActive ? "ACTIVE" : "SUSPENDED"} />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const p = row as unknown as AdminProduct;
              return (
                <button
                  type="button"
                  className="text-sm text-error hover:underline"
                  onClick={async () => {
                    if (!confirm(`${t("actions.delete")} ${p.name}?`)) return;
                    try {
                      await deleteAdminProduct(p.id);
                      toast("Product deleted", "success");
                      load();
                    } catch {
                      toast("Cannot delete product with orders", "error");
                    }
                  }}
                >
                  {t("actions.delete")}
                </button>
              );
            },
          },
        ]}
      />
    </div>
  );
}
