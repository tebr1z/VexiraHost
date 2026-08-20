"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { stashAuthNext } from "../lib/auth-redirect";
import { buildOAuthUrl } from "../lib/oauth-url";

import { GoogleAccountPrompt } from "./google-account-prompt";
import { GoogleIcon } from "./google-icon";

function readNextFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

type OAuthButtonsProps = {
  disabled?: boolean;
  turnstileToken?: string;
  intent?: "login" | "signup";
};

export function OAuthButtons({
  disabled = false,
  turnstileToken,
  intent = "login",
}: OAuthButtonsProps): React.ReactElement {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pendingGoogle, setPendingGoogle] = useState(false);

  const locked = disabled || pendingGoogle;

  const startGoogle = (loginHint?: string) => {
    if (disabled) return;
    stashAuthNext(readNextFromUrl());
    setPendingGoogle(true);
    window.location.href = buildOAuthUrl("google", {
      loginHint,
      locale,
      turnstileToken: turnstileToken || undefined,
      intent,
    });
  };

  return (
    <div className="space-y-3">
      <GoogleAccountPrompt disabled={disabled} turnstileToken={turnstileToken} intent={intent} />

      <button
        type="button"
        disabled={locked}
        onClick={() => startGoogle()}
        className="border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {t("continueGoogle")}
      </button>

      {disabled ? (
        <p className="text-on-surface-variant text-center text-xs">{t("googleNeedsTurnstile")}</p>
      ) : null}
    </div>
  );
}
