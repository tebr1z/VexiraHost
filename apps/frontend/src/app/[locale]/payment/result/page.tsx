"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

function PaymentResultContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    if (window.parent !== window) {
      setEmbedded(true);
      // A notification only. The parent still verifies the owned payment through the backend.
      window.parent.postMessage({ type: "vexira:bank-return" }, window.location.origin);
    }
  }, []);
  const t = useTranslations("paymentResult");
  const ok = searchParams.get("ok") === "1";
  const orderId = searchParams.get("orderId");
  const reason = searchParams.get("reason");
  const bankStatus = searchParams.get("bankStatus");

  if (embedded)
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-center">
        <p>{t("embeddedReturn")}</p>
      </div>
    );
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-primary text-2xl font-bold">
        {ok ? t("successTitle") : t("failedTitle")}
      </h1>
      <p className="text-on-surface-variant mt-3">{ok ? t("successBody") : t("failedBody")}</p>
      {!ok && bankStatus ? (
        <p className="text-error mt-2 text-sm font-medium">
          {t("bankStatus", { status: bankStatus })}
        </p>
      ) : null}
      {!ok && reason ? (
        <p className="text-on-surface-variant/80 mt-2 text-sm">{t("reason", { reason })}</p>
      ) : null}
      {!ok ? (
        <p className="bg-surface-container-low text-on-surface-variant mt-4 rounded-xl px-4 py-3 text-left text-sm">
          {t("testCardHint")}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {ok && orderId ? (
          <Link
            href={`/dashboard/orders/${orderId}`}
            className="bg-primary text-on-primary inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold"
          >
            {t("viewOrder")}
          </Link>
        ) : null}
        <Link
          href="/dashboard"
          className="border-outline-variant inline-flex h-11 items-center rounded-xl border px-5 text-sm font-semibold"
        >
          {t("dashboard")}
        </Link>
        {!ok ? (
          <Link
            href="/cart"
            className="border-outline-variant inline-flex h-11 items-center rounded-xl border px-5 text-sm font-semibold"
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
    <Suspense fallback={<p className="text-on-surface-variant p-8 text-center">…</p>}>
      <PaymentResultContent />
    </Suspense>
  );
}
