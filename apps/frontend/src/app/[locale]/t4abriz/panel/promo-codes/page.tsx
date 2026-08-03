"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DataTable,
  EditIconLink,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableRowActions,
} from "@/components/ui";
import { deleteAdminPromoCode, listAdminPromoCodes, type AdminPromoCode } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminPromoCodesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.promoCodes");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [rows, setRows] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    listAdminPromoCodes()
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
            href="/t4abriz/panel/promo-codes/new"
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
            key: "code",
            header: tp("colCode"),
            sortable: true,
            render: (row) => {
              const promo = row as unknown as AdminPromoCode;
              return <span className="text-on-surface font-mono font-medium">{promo.code}</span>;
            },
          },
          {
            key: "type",
            header: tp("colType"),
            render: (row) => {
              const promo = row as unknown as AdminPromoCode;
              return promo.type === "PERCENT"
                ? `${promo.value}%`
                : formatMoney(promo.value, promo.currency ?? "USD", locale);
            },
          },
          {
            key: "redemptions",
            header: tp("colUses"),
            render: (row) => {
              const promo = row as unknown as AdminPromoCode;
              const max = promo.maxRedemptions ?? "∞";
              return `${promo.redemptionCount} / ${max}`;
            },
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge
                status={(row as unknown as AdminPromoCode).isActive ? "ACTIVE" : "SUSPENDED"}
              />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const promo = row as unknown as AdminPromoCode;
              return (
                <TableRowActions>
                  <EditIconLink
                    href={`/t4abriz/panel/promo-codes/${promo.id}`}
                    label={tu("edit")}
                  />
                  <button
                    type="button"
                    className="text-error text-sm hover:underline"
                    onClick={async () => {
                      if (!confirm(`${t("actions.delete")} ${promo.code}?`)) return;
                      try {
                        await deleteAdminPromoCode(promo.id);
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
          actionHref="/t4abriz/panel/promo-codes/new"
        />
      )}
    </div>
  );
}
