"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { unsubscribeMarketing } from "@/features/admin";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";

function UnsubscribeInner(): React.ReactElement {
  const t = useTranslations("marketing");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("missingToken"));
      return;
    }
    unsubscribeMarketing(token)
      .then((res) => {
        setStatus("ok");
        setMessage(res.message ?? t("success"));
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getApiErrorMessage(err, t("failed")));
      });
  }, [token, t]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-jakarta text-primary text-2xl font-bold">{t("title")}</h1>
      <p className="text-on-surface-variant mt-4">
        {status === "loading" ? t("processing") : message}
      </p>
      <Link href="/" className="text-secondary mt-8 text-sm font-semibold hover:underline">
        {t("backHome")}
      </Link>
    </div>
  );
}

export default function UnsubscribePage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="text-on-surface-variant flex min-h-[40vh] items-center justify-center">
          …
        </div>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
