"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { verifyEmailTokenRequest } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";

type Status = "checking" | "success" | "error";

export default function VerifyEmailPage(): React.ReactElement {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const setSession = useAuthStore((s) => s.setSession);
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError(t("verifyEmailNoToken"));
      return;
    }

    verifyEmailTokenRequest(token)
      .then((session) => {
        setSession(session);
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 900);
      })
      .catch((err) => {
        setStatus("error");
        const message = getApiErrorMessage(err, t("verifyEmailFailed"));
        if (message.toLowerCase().includes("already verified")) {
          setError(t("verifyEmailAlreadyVerified"));
          return;
        }
        if (message.toLowerCase().includes("expired")) {
          setError(t("verifyEmailExpired"));
          return;
        }
        setError(message);
      });
  }, [token, t, setSession, router]);

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
      <h1 className="font-jakarta text-3xl font-bold text-primary sm:text-headline-lg">
        {t("verifyEmailTitle")}
      </h1>

      {status === "checking" && (
        <p className="mt-4 text-sm text-on-surface-variant">{t("verifyEmailChecking")}</p>
      )}

      {status === "success" && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {t("verifyEmailSuccessRedirect")}
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
          {error ?? t("verifyEmailFailed")}
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
