"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  InvoiceActionDialog,
  type InvoiceAction,
} from "@/components/billing/invoice-action-dialog";
import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import {
  listAdminInvoices,
  markAdminInvoicePaid,
  voidAdminInvoice,
  type AdminInvoice,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

export default function AdminInvoicesPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.invoices");
  const tu = useTranslations("ui");
  const ta = useTranslations("invoiceActions");
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid" | "void">("unpaid");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ invoice: AdminInvoice; action: InvoiceAction } | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const saving = useRef(false);

  const load = useCallback(async () => {
    const rows = await listAdminInvoices();
    setInvoices(rows);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => toast(getApiErrorMessage(err, tp("loadFailed")), "error"))
      .finally(() => setLoading(false));
  }, [load, tp]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return invoices.filter((inv) => {
      const status =
        filter === "all" ||
        (filter === "unpaid"
          ? ["OPEN", "OVERDUE"].includes(inv.status)
          : inv.status === (filter === "paid" ? "PAID" : "VOID"));
      return (
        status &&
        (!query ||
          [inv.invoiceNumber, inv.customer.email, inv.hostingDomain, inv.domainName].some((value) =>
            value?.toLocaleLowerCase().includes(query),
          ))
      );
    });
  }, [filter, invoices, search]);

  const selectAction = (invoice: AdminInvoice, action: InvoiceAction) => {
    setActionError(null);
    setSelected({ invoice, action });
  };
  const handleAction = async () => {
    if (!selected || saving.current) return;
    saving.current = true;
    setBusyId(selected.invoice.id);
    setActionError(null);
    try {
      const result =
        selected.action === "paid"
          ? await markAdminInvoicePaid(selected.invoice.id)
          : await voidAdminInvoice(selected.invoice.id);
      setInvoices((rows) =>
        rows.map((row) =>
          row.id === result.id ? { ...row, status: result.status, amountDue: 0 } : row,
        ),
      );
      setSelected(null);
      toast(selected.action === "paid" ? tp("markedPaid") : ta("voidSuccess"), "success");
      void load().catch((err) => toast(getApiErrorMessage(err, tp("loadFailed")), "error"));
    } catch (err) {
      const message = getApiErrorMessage(err, ta("actionFailed"));
      const errors: Record<string, string> = {
        INVOICE_PENDING_PAYMENT: ta("pendingHint"),
        INVOICE_HAS_PAYMENTS: ta("partialHint"),
        INVOICE_ALREADY_PAID: ta("alreadyPaid"),
        INVOICE_NOT_PAYABLE: ta("notPayable"),
      };
      setActionError(errors[message] ?? message);
    } finally {
      saving.current = false;
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={ta("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label={ta("filterLabel")}>
          {(["unpaid", "paid", "void", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={
                filter === value
                  ? "bg-primary text-on-primary rounded-xl px-3 py-2 text-xs font-semibold"
                  : "rounded-xl px-3 py-2 text-xs font-semibold text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)]"
              }
            >
              {value === "all"
                ? tp("filterAll")
                : value === "unpaid"
                  ? tp("filterUnpaid")
                  : ta(value === "paid" ? "paidFilter" : "voidFilter")}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label={ta("search")}
          placeholder={ta("search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-base)] px-3 text-sm sm:max-w-xs"
        />
      </div>

      <DataTable
        key={`${filter}:${search}:${visible.length}`}
        data={visible as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "invoiceNumber",
            header: tu("table.invoice"),
            sortable: true,
            render: (row) => (row as unknown as AdminInvoice).invoiceNumber,
          },
          {
            key: "customer",
            header: tu("table.customer"),
            sortable: true,
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              return (
                <Link
                  href={`/t4abriz/panel/users/${inv.customer.id}`}
                  className="text-secondary hover:underline"
                >
                  {inv.customer.email}
                </Link>
              );
            },
          },
          {
            key: "service",
            header: tp("service"),
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              return inv.hostingDomain || inv.domainName || "—";
            },
          },
          {
            key: "total",
            header: tu("table.amount"),
            sortable: true,
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              return formatMoney(inv.total, inv.currency, locale);
            },
          },
          {
            key: "status",
            header: tu("table.status"),
            render: (row) => <StatusBadge status={(row as unknown as AdminInvoice).status} />,
          },
          {
            key: "dueDate",
            header: tu("table.date"),
            sortable: true,
            render: (row) => formatDate((row as unknown as AdminInvoice).dueDate, locale),
          },
          {
            key: "orderId",
            header: tu("table.order"),
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              if (!inv.orderId) return "—";
              return (
                <Link
                  href={`/t4abriz/panel/orders/${inv.orderId}`}
                  className="text-secondary hover:underline"
                >
                  #{inv.orderId.slice(-8)}
                </Link>
              );
            },
          },
          {
            key: "actions",
            header: tu("table.actions"),
            render: (row) => {
              const inv = row as unknown as AdminInvoice;
              const unpaid = inv.status === "OPEN" || inv.status === "OVERDUE";
              const draft = inv.status === "DRAFT";
              if (!unpaid && !draft) return "—";
              const pending = (inv.pendingPaymentCount ?? 0) > 0;
              const partial = (inv.amountPaid ?? 0) > 0;
              return (
                <div className="min-w-[190px] space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {unpaid && (
                      <button
                        type="button"
                        disabled={busyId != null || pending}
                        onClick={() => selectAction(inv, "paid")}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {ta("confirmPaid")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId != null || pending || partial}
                      onClick={() => selectAction(inv, "void")}
                      className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300"
                    >
                      {ta("confirmVoid")}
                    </button>
                  </div>
                  {pending || partial ? (
                    <p className="max-w-[260px] text-xs leading-relaxed text-[var(--label-secondary)]">
                      {ta(pending ? "pendingHint" : "partialHint")}
                    </p>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />
      {selected && (
        <InvoiceActionDialog
          key={`${selected.invoice.id}:${selected.action}`}
          invoice={selected.invoice}
          action={selected.action}
          busy={busyId != null}
          error={actionError}
          onClose={() => setSelected(null)}
          onConfirm={() => void handleAction()}
        />
      )}
    </div>
  );
}
