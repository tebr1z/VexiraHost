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
import { deleteAdminTld, listAdminTlds, type AdminTldPricing } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminTldsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.tldPricing");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [tlds, setTlds] = useState<AdminTldPricing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    listAdminTlds()
      .then(setTlds)
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
            href="/t4abriz/panel/domains/tlds/new"
            className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
          >
            {tp("add")}
          </Link>
        }
      />
      <DataTable
        data={tlds as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "tld",
            header: "TLD",
            sortable: true,
            render: (row) => {
              const tld = row as unknown as AdminTldPricing;
              return <span className="text-on-surface font-mono font-medium">.{tld.tld}</span>;
            },
          },
          {
            key: "registerPrice",
            header: "Register",
            render: (row) =>
              formatMoney((row as unknown as AdminTldPricing).registerPrice, "USD", locale),
          },
          {
            key: "renewPrice",
            header: "Renew",
            render: (row) =>
              formatMoney((row as unknown as AdminTldPricing).renewPrice, "USD", locale),
          },
          {
            key: "transferPrice",
            header: "Transfer",
            render: (row) =>
              formatMoney((row as unknown as AdminTldPricing).transferPrice, "USD", locale),
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge
                status={(row as unknown as AdminTldPricing).isActive ? "ACTIVE" : "SUSPENDED"}
              />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const tld = row as unknown as AdminTldPricing;
              return (
                <TableRowActions>
                  <EditIconLink href={`/t4abriz/panel/domains/tlds/${tld.id}`} label={tu("edit")} />
                  <button
                    type="button"
                    className="text-error text-sm hover:underline"
                    onClick={async () => {
                      if (!confirm(`${t("actions.delete")} .${tld.tld}?`)) return;
                      try {
                        await deleteAdminTld(tld.id);
                        toast("TLD deleted", "success");
                        load();
                      } catch {
                        toast("Could not delete TLD", "error");
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
      {!loading && tlds.length === 0 && (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("add")}
          actionHref="/t4abriz/panel/domains/tlds/new"
        />
      )}
    </div>
  );
}
