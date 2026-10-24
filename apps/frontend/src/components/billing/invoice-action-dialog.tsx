"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { AdminInvoice } from "@/features/admin";
import { formatMoney } from "@/lib/i18n/format";

export type InvoiceAction = "paid" | "void";
export function InvoiceActionDialog({
  invoice,
  action,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  invoice: AdminInvoice;
  action: InvoiceAction;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("invoiceActions");
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const paid = action === "paid";
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby="invoice-action-title"
      aria-describedby="invoice-action-description"
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-0 text-[var(--label)] shadow-2xl backdrop:bg-black/60"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && (!paid || confirmed)) onConfirm();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--separator)] p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
              {invoice.invoiceNumber}
            </p>
            <h2 id="invoice-action-title" className="mt-2 text-xl font-bold">
              {t(paid ? "paidTitle" : "voidTitle")}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            aria-label={t("back")}
            className="h-10 w-10 shrink-0 rounded-full bg-[var(--fill-secondary)] text-xl disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <dl className="space-y-3 rounded-xl bg-[var(--fill-secondary)] p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--label-secondary)]">{t("customer")}</dt>
              <dd className="break-all font-medium">{invoice.customer.email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--label-secondary)]">{t("remaining")}</dt>
              <dd className="font-bold tabular-nums">
                {formatMoney(invoice.amountDue ?? invoice.total, invoice.currency, locale)}
              </dd>
            </div>
          </dl>
          <p
            id="invoice-action-description"
            className="text-sm leading-relaxed text-[var(--label-secondary)]"
          >
            {t(paid ? "paidDescription" : "voidDescription")}
          </p>
          {paid && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--separator)] p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={busy}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>{t("receiptConfirmed")}</span>
            </label>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
            >
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--separator)] p-5 sm:p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[var(--separator)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {t("back")}
          </button>
          <button
            type="submit"
            disabled={busy || (paid && !confirmed)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${paid ? "bg-blue-600 hover:bg-blue-500" : "bg-red-600 hover:bg-red-500"}`}
          >
            {busy ? t("saving") : t(paid ? "confirmPaid" : "confirmVoid")}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
