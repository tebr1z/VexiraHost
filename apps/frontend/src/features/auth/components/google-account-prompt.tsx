"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { stashAuthNext } from "../lib/auth-redirect";
import { buildOAuthUrl } from "../lib/oauth-url";

import { getLastGoogleAccount, type LastGoogleAccount } from "@/lib/last-google-account";

type GoogleAccountPromptProps = {
  disabled?: boolean;
  turnstileToken?: string;
  intent?: "login" | "signup";
};

export function GoogleAccountPrompt({
  disabled = false,
  turnstileToken,
  intent = "login",
}: GoogleAccountPromptProps): React.ReactElement | null {
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
  const locked = disabled || confirming;

  const continueWithAccount = () => {
    if (disabled) return;
    setConfirming(true);
    stashAuthNext(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null,
    );
    window.location.href = buildOAuthUrl("google", {
      loginHint: account.email,
      locale,
      turnstileToken: turnstileToken || undefined,
      intent,
    });
  };

  const useOtherAccount = () => {
    if (disabled) return;
    stashAuthNext(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null,
    );
    window.location.href = buildOAuthUrl("google", {
      locale,
      turnstileToken: turnstileToken || undefined,
      intent,
    });
  };

  return (
    <div className="border-outline-variant bg-surface-container-low mb-4 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <span className="ring-outline-variant/40 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-[#4285F4] shadow-sm ring-1">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-on-surface truncate text-sm font-semibold">{displayName}</p>
          <p className="text-on-surface-variant truncate text-xs">{account.email}</p>
        </div>
      </div>

      <p className="text-on-surface-variant mt-3 text-sm">{t("googleAccountPrompt")}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={locked}
          onClick={continueWithAccount}
          className="bg-primary text-on-primary flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirming ? t("signingIn") : t("googleAccountConfirm")}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={useOtherAccount}
          className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("googleAccountOther")}
        </button>
      </div>
    </div>
  );
}
