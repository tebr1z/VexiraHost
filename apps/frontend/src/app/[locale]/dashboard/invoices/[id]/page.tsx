"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { InvoiceDocument } from "@/components/billing/invoice-document";
import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  chargeInvoice,
  downloadInvoicePdf,
  getAccountBalance,
  getInvoice,
  type InvoiceDetail,
} from "@/features/billing";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function InvoiceDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.invoices");
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payingBalance, setPayingBalance] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");

  useEffect(() => {
    Promise.all([getInvoice(id), getAccountBalance().catch(() => null)])
      .then(([inv, bal]) => {
        setInvoice(inv);
        setBalance(bal);
        const due = inv.amountDue ?? inv.total;
        const max =
          bal && bal.currency.toUpperCase() === inv.currency.toUpperCase()
            ? Math.min(bal.balance, due)
            : due;
        setBalanceAmount(max > 0 ? max.toFixed(2) : "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const amountDue = useMemo(() => {
    if (!invoice) return 0;
    return roundMoney(invoice.amountDue ?? invoice.total);
  }, [invoice]);

  const maxBalancePay = useMemo(() => {
    if (!invoice || !balance) return 0;
    if (balance.currency.toUpperCase() !== invoice.currency.toUpperCase()) return 0;
    return roundMoney(Math.min(balance.balance, amountDue));
  }, [invoice, balance, amountDue]);

  const canPayWithBalance = invoice?.status === "OPEN" && balance != null && maxBalancePay > 0;

  const handlePay = async (useBalance = false) => {
    if (useBalance) setPayingBalance(true);
    else setPaying(true);
    setMessage(null);
    setMessageOk(false);
    try {
      let amount: number | undefined;
      if (useBalance) {
        amount = roundMoney(Number(balanceAmount));
        if (!Number.isFinite(amount) || amount <= 0) {
          setMessageOk(false);
          setMessage(tc("balanceAmountInvalid"));
          return;
        }
        if (amount > maxBalancePay + 0.001) {
          setMessageOk(false);
          setMessage(tc("balanceAmountTooHigh", { max: maxBalancePay.toFixed(2) }));
          return;
        }
      }

      const payment = await chargeInvoice(id, { useBalance, amount });

      if (payment?.mode === "redirect" && payment.redirectUrl) {
        setMessage(tc("redirectingToBank"));
        window.location.assign(payment.redirectUrl);
        return;
      }

      setMessageOk(true);
      if (useBalance && payment?.invoiceFullyPaid === false) {
        setMessage(
          tc("paymentSuccessBalancePartial", {
            amount: Number(payment.amount ?? amount).toFixed(2),
            due: Number(payment.amountDue ?? 0).toFixed(2),
            currency: invoice?.currency ?? "",
          }),
        );
      } else {
        setMessage(useBalance ? tc("paymentSuccessBalance") : tc("paymentSuccess"));
      }

      const [updated, bal] = await Promise.all([
        getInvoice(id),
        getAccountBalance().catch(() => null),
      ]);
      setInvoice(updated);
      setBalance(bal);
      const due = updated.amountDue ?? updated.total;
      const max =
        bal && bal.currency.toUpperCase() === updated.currency.toUpperCase()
          ? Math.min(bal.balance, due)
          : due;
      setBalanceAmount(updated.status === "OPEN" && max > 0 ? max.toFixed(2) : "");
    } catch (err) {
      setMessageOk(false);
      setMessage(getApiErrorMessage(err, tc("paymentFailed")));
    } finally {
      setPaying(false);
      setPayingBalance(false);
    }
  };

  const handleDownloadPdf = async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    setDownloadingPdf(true);
    setMessage(null);
    try {
      await downloadInvoicePdf(id, token);
    } catch {
      setMessage(tp("pdfFailed"));
      setMessageOk(false);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return <LoadingSkeletonList rows={4} />;
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <p className="text-error">{tc("invoiceNotFound")}</p>
        <Link href="/dashboard/invoices" className="text-primary hover:underline">
          {tc("backToInvoices")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={tp("detailDescription")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.invoices"), href: "/dashboard/invoices" },
          { label: invoice.invoiceNumber },
        ]}
      />

      {balance && (
        <p className="text-on-surface-variant text-sm">
          {tc("accountBalance")}:{" "}
          <span className="text-on-surface font-semibold">
            {balance.balance.toFixed(2)} {balance.currency}
          </span>
        </p>
      )}

      {canPayWithBalance && (
        <div className="border-outline-variant/50 bg-surface-container-low/40 rounded-xl border p-4">
          <label htmlFor="balance-amount" className="text-on-surface block text-sm font-medium">
            {tc("balancePayAmount")}
          </label>
          <p className="text-on-surface-variant mt-1 text-xs">
            {tc("balancePayHint", {
              max: maxBalancePay.toFixed(2),
              due: amountDue.toFixed(2),
              currency: invoice.currency,
            })}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-xs flex-1">
              <input
                id="balance-amount"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={maxBalancePay}
                step="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                className="border-outline-variant bg-surface text-on-surface h-11 w-full rounded-xl border px-3 pr-14 text-sm tabular-nums"
              />
              <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium">
                {invoice.currency}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBalanceAmount(maxBalancePay.toFixed(2))}
              className="border-outline-variant text-on-surface hover:bg-surface h-11 rounded-xl border px-4 text-sm font-medium"
            >
              {tc("balancePayMax")}
            </button>
          </div>
        </div>
      )}

      <InvoiceDocument
        invoice={invoice}
        locale={locale}
        actions={
          <>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-5 text-sm font-semibold text-[var(--label)] transition hover:bg-[var(--fill-secondary)] disabled:opacity-60"
            >
              {downloadingPdf ? tp("downloadingPdf") : tp("downloadPdf")}
            </button>
            {invoice.status === "OPEN" && (
              <>
                {canPayWithBalance && (
                  <button
                    type="button"
                    onClick={() => void handlePay(true)}
                    disabled={paying || payingBalance}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--accent)] bg-[var(--bg-elevated)] px-5 text-sm font-semibold text-[var(--accent)] disabled:opacity-60"
                  >
                    {payingBalance ? tc("payingWithBalance") : tc("payWithBalance")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handlePay(false)}
                  disabled={paying || payingBalance}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {paying ? tc("redirectingToBank") : tc("payInvoice")}
                </button>
              </>
            )}
          </>
        }
      />

      {message && <p className={messageOk ? "text-green-700" : "text-error"}>{message}</p>}

      <Link
        href="/dashboard/invoices"
        className="text-primary inline-block text-sm hover:underline"
      >
        {tc("backToInvoices")}
      </Link>
    </div>
  );
}
