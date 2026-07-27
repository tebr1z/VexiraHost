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

export function OAuthButtons(): React.ReactElement {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pendingGoogle, setPendingGoogle] = useState(false);

  const startGoogle = (loginHint?: string) => {
    stashAuthNext(readNextFromUrl());
    setPendingGoogle(true);
    window.location.href = buildOAuthUrl("google", { loginHint, locale });
  };

  return (
    <div className="space-y-3">
      <GoogleAccountPrompt />

      <button
        type="button"
        disabled={pendingGoogle}
        onClick={() => startGoogle()}
        className="border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition disabled:opacity-60"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {t("continueGoogle")}
      </button>
    </div>
  );
}
