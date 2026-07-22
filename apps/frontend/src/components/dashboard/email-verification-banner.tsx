"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { resendVerificationRequest } from "@/features/auth/services/auth.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

export function EmailVerificationBanner(): React.ReactElement {
  const t = useTranslations("dashboard.home");
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    try {
      setSending(true);
      await resendVerificationRequest();
      toast(t("verifyEmailResent"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, t("verifyEmailResendFailed")), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-amber-300/50 bg-amber-100/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("verifyEmail")}</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-3 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {sending ? t("verifyEmailResending") : t("verifyEmailResend")}
        </button>
      </div>
    </div>
  );
}
