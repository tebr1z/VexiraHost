"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { buildOAuthUrl } from "../lib/oauth-url";
import { GoogleAccountPrompt } from "./google-account-prompt";
import { GoogleIcon } from "./google-icon";

export function OAuthButtons(): React.ReactElement {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pendingGoogle, setPendingGoogle] = useState(false);

  const startGoogle = (loginHint?: string) => {
    setPendingGoogle(true);
    window.location.href = buildOAuthUrl("google", { loginHint, locale });
  };

  const handleGoogleClick = () => {
    startGoogle();
  };

  return (
    <div className="space-y-3">
      <GoogleAccountPrompt />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pendingGoogle}
          onClick={handleGoogleClick}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm font-medium transition hover:bg-surface-container-low disabled:opacity-60"
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          {t("continueGoogle")}
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = buildOAuthUrl("github");
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm font-medium transition hover:bg-surface-container-low"
        >
          <span className="text-base font-bold">GH</span>
          {t("continueGithub")}
        </button>
      </div>
    </div>
  );
}
