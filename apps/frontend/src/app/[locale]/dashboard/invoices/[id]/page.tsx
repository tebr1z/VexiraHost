"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { InvoiceDocument } from "@/components/billing/invoice-document";
import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  chargeInvoice,
  downloadInvoicePdf,
  getInvoice,
  type InvoiceDetail,
} from "@/features/billing";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";

export default function InvoiceDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.invoices");
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);

  useEffect(() => {
    getInvoice(id)
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [id]);

  const handlePay = async () => {
    setPaying(true);
    setMessage(null);
    setMessageOk(false);
    try {
      const payment = await chargeInvoice(id);

      if (payment?.mode === "redirect" && payment.redirectUrl) {
        setMessage(tc("redirectingToBank"));
        window.location.assign(payment.redirectUrl);
        return;
      }

      setMessageOk(true);
      setMessage(tc("paymentSuccess"));
      const updated = await getInvoice(id);
      setInvoice(updated);
      setPaying(false);
    } catch (err) {
      setMessageOk(false);
      setMessage(getApiErrorMessage(err, tc("paymentFailed")));
      setPaying(false);
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

      <InvoiceDocument
        invoice={invoice}
        locale={locale}
        actions={
          <>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-primary hover:bg-slate-50 disabled:opacity-60"
            >
              {downloadingPdf ? tp("downloadingPdf") : tp("downloadPdf")}
            </button>
            {invoice.status === "OPEN" && (
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-60"
              >
                {paying ? tc("redirectingToBank") : tc("payInvoice")}
              </button>
            )}
          </>
        }
      />

      {message && (
        <p className={messageOk ? "text-green-700" : "text-error"}>{message}</p>
      )}

      <Link href="/dashboard/invoices" className="inline-block text-sm text-primary hover:underline">
        {tc("backToInvoices")}
      </Link>
    </div>
  );
}
