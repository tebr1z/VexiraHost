"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

function PaymentResultContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const t = useTranslations("paymentResult");
  const ok = searchParams.get("ok") === "1";
  const orderId = searchParams.get("orderId");
  const reason = searchParams.get("reason");
  const bankStatus = searchParams.get("bankStatus");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-primary">{ok ? t("successTitle") : t("failedTitle")}</h1>
      <p className="mt-3 text-on-surface-variant">
        {ok ? t("successBody") : t("failedBody")}
      </p>
      {!ok && bankStatus ? (
        <p className="mt-2 text-sm font-medium text-error">{t("bankStatus", { status: bankStatus })}</p>
      ) : null}
      {!ok && reason ? (
        <p className="mt-2 text-sm text-on-surface-variant/80">{t("reason", { reason })}</p>
      ) : null}
      {!ok ? (
        <p className="mt-4 rounded-xl bg-surface-container-low px-4 py-3 text-left text-sm text-on-surface-variant">
          {t("testCardHint")}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {ok && orderId ? (
          <Link
            href={`/dashboard/orders/${orderId}`}
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {t("viewOrder")}
          </Link>
        ) : null}
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-xl border border-outline-variant px-5 text-sm font-semibold"
        >
          {t("dashboard")}
        </Link>
        {!ok ? (
          <Link
            href="/cart"
            className="inline-flex h-11 items-center rounded-xl border border-outline-variant px-5 text-sm font-semibold"
          >
            {t("backToCart")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentResultPage(): React.ReactElement {
  return (
    <Suspense fallback={<p className="p-8 text-center text-on-surface-variant">…</p>}>
      <PaymentResultContent />
    </Suspense>
  );
}
