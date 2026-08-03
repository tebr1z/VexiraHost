"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import {
  listDomainChangeRequests,
  updateDomainChangeStatus,
  type DomainChangeRequest,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminDomainChangesPage(): React.ReactElement | null {
  useRequireAuth();
  const searchParams = useSearchParams();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.domainChanges");
  const tu = useTranslations("ui");
  const isStaff = useAuthStore((s) => s.user?.role === "admin" || s.user?.role === "staff");
  const [rows, setRows] = useState<DomainChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "APPLIED" | "DISMISSED" | "ALL">("PENDING");
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listDomainChangeRequests(filter === "ALL" ? undefined : filter)
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "PENDING" || status === "APPLIED" || status === "DISMISSED") {
      setFilter(status);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff, filter]);

  const handleStatus = async (id: string, status: "APPLIED" | "DISMISSED") => {
    setActingId(id);
    try {
      await updateDomainChangeStatus(id, status);
      toast(tp("updated"), "success");
      load();
    } catch {
      toast(tp("updateFailed"), "error");
    } finally {
      setActingId(null);
    }
  };

  if (!isStaff) return <p className="text-on-surface-variant">{tp("staffOnly")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: t("nav.users"), href: "/t4abriz/panel/users" },
          { label: tp("title") },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPLIED", "DISMISSED", "ALL"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              filter === key
                ? "bg-primary text-on-primary"
                : "border-outline-variant text-on-surface border"
            }`}
          >
            {tp(`filters.${key}`)}
          </button>
        ))}
      </div>

      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tp("empty")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "createdAt",
            header: tp("colDate"),
            sortable: true,
            render: (row) =>
              new Date((row as unknown as DomainChangeRequest).createdAt).toLocaleString(),
          },
          {
            key: "domain",
            header: tp("colDomain"),
            render: (row) => (
              <span className="font-semibold">
                {(row as unknown as DomainChangeRequest).domain.name}
              </span>
            ),
          },
          {
            key: "user",
            header: tp("colCustomer"),
            render: (row) => (row as unknown as DomainChangeRequest).user.email,
          },
          {
            key: "type",
            header: tp("colType"),
            render: (row) => tp(`types.${(row as unknown as DomainChangeRequest).type}`),
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge status={(row as unknown as DomainChangeRequest).status} />
            ),
          },
          {
            key: "details",
            header: tp("colDetails"),
            render: (row) => {
              const item = row as unknown as DomainChangeRequest;
              return (
                <details className="text-xs">
                  <summary className="text-secondary cursor-pointer">{tp("viewJson")}</summary>
                  <pre className="bg-surface-container-low mt-2 max-w-md overflow-auto rounded-lg p-2">
                    {JSON.stringify(item.requestedData, null, 2)}
                  </pre>
                </details>
              );
            },
          },
          {
            key: "actions",
            header: tp("colActions"),
            render: (row) => {
              const item = row as unknown as DomainChangeRequest;
              if (item.status !== "PENDING") return "—";
              return (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => void handleStatus(item.id, "APPLIED")}
                    className="bg-secondary text-on-secondary rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-60"
                  >
                    {tp("markApplied")}
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => void handleStatus(item.id, "DISMISSED")}
                    className="border-outline-variant rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-60"
                  >
                    {tp("dismiss")}
                  </button>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
