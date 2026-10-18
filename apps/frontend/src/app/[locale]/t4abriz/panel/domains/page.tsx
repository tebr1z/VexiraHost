"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import {
  listAdminDomains,
  type AdminDomainInventoryItem,
} from "@/features/admin/services/admin-domains.service";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminDomainsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.domainInventory");
  const tu = useTranslations("ui");
  const role = useAuthStore((state) => state.user?.role);
  const isStaff = role === "admin" || role === "staff";
  const [rows, setRows] = useState<AdminDomainInventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaff) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      listAdminDomains(query)
        .then(setRows)
        .catch(() => toast(tp("loadFailed"), "error"))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isStaff, query, tp]);

  if (!isStaff) return <p className="text-on-surface-variant">{tp("staffOnly")}</p>;

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

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tp("searchPlaceholder")}
          className="border-outline-variant bg-surface min-w-72 flex-1 rounded-xl border px-4 py-2.5 text-sm"
        />
        <Link
          href="/t4abriz/panel/domains/changes"
          className="border-outline-variant bg-surface rounded-xl border px-4 py-2.5 text-sm font-semibold"
        >
          {tp("changeRequests")}
        </Link>
        {role === "admin" ? (
          <Link
            href="/t4abriz/panel/domains/tlds"
            className="bg-primary text-on-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {tp("tldPricing")}
          </Link>
        ) : null}
      </div>

      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tp("empty")}
        pageSize={20}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "name",
            header: tp("colDomain"),
            sortable: true,
            render: (row) => {
              const item = row as unknown as AdminDomainInventoryItem;
              return (
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-on-surface-variant text-xs">{item.managementMode}</p>
                </div>
              );
            },
          },
          {
            key: "user",
            header: tp("colCustomer"),
            render: (row) => (row as unknown as AdminDomainInventoryItem).user.email,
          },
          {
            key: "status",
            header: tu("table.status"),
            sortable: true,
            render: (row) => (
              <StatusBadge status={(row as unknown as AdminDomainInventoryItem).status} />
            ),
          },
          {
            key: "dnsProvider",
            header: tp("colDns"),
            sortable: true,
            render: (row) => {
              const item = row as unknown as AdminDomainInventoryItem;
              return (
                <div>
                  <p className="font-semibold">{item.dnsProvider}</p>
                  <p className="text-on-surface-variant text-xs">
                    {tp("recordCount", { count: item.dnsRecordCount })}
                  </p>
                </div>
              );
            },
          },
          {
            key: "pendingChangeCount",
            header: tp("colPending"),
            sortable: true,
            render: (row) =>
              String((row as unknown as AdminDomainInventoryItem).pendingChangeCount),
          },
          {
            key: "expiresAt",
            header: tp("colExpires"),
            sortable: true,
            render: (row) => {
              const value = (row as unknown as AdminDomainInventoryItem).expiresAt;
              return value ? new Date(value).toLocaleDateString() : "—";
            },
          },
        ]}
      />
    </div>
  );
}
