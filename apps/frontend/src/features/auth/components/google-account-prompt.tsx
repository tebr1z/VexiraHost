"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { getLastGoogleAccount, type LastGoogleAccount } from "@/lib/last-google-account";

import { buildOAuthUrl } from "../lib/oauth-url";

export function GoogleAccountPrompt(): React.ReactElement | null {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [account, setAccount] = useState<LastGoogleAccount | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setAccount(getLastGoogleAccount());
  }, []);

  if (!account) return null;

  const displayName = account.name?.trim() || account.email;
  const initial = displayName.charAt(0).toUpperCase();

  const continueWithAccount = () => {
    setConfirming(true);
    window.location.href = buildOAuthUrl("google", { loginHint: account.email, locale });
  };

  const useOtherAccount = () => {
    window.location.href = buildOAuthUrl("google", { locale });
  };

  return (
    <div className="mb-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-[#4285F4] shadow-sm ring-1 ring-outline-variant/40">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-on-surface">{displayName}</p>
          <p className="truncate text-xs text-on-surface-variant">{account.email}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-on-surface-variant">{t("googleAccountPrompt")}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={confirming}
          onClick={continueWithAccount}
          className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {confirming ? t("signingIn") : t("googleAccountConfirm")}
        </button>
        <button
          type="button"
          disabled={confirming}
          onClick={useOtherAccount}
          className="flex h-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface transition hover:bg-surface-container-low disabled:opacity-60"
        >
          {t("googleAccountOther")}
        </button>
      </div>
    </div>
  );
}
