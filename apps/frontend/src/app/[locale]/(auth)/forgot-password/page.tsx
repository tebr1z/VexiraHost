"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";
import { forgotPasswordRequest } from "@/features/auth/services/auth.service";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { useMaintenanceStore } from "@/stores/maintenance-store";

export default function ForgotPasswordPage(): React.ReactElement {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstile = useMaintenanceStore((s) => s.turnstile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(tv("emailRequired"));
      return;
    }

    try {
      setLoading(true);
      await forgotPasswordRequest(trimmed, turnstileToken || undefined);
      setDone(true);
    } catch (err) {
      setError(
        getApiErrorMessage(err, t("forgotPasswordFailed"), {
          turnstileFailed: t("turnstileFailed"),
        }),
      );
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  if (done) {
    return (
      <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
        <h1 className="font-jakarta text-primary sm:text-headline-lg text-3xl font-bold">
          {t("forgotPasswordTitle")}
        </h1>
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {t("forgotPasswordSuccess", { email: email.trim() })}
        </div>
        <p className="text-on-surface-variant mt-3 text-sm">{t("forgotPasswordSuccessHint")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="bg-primary text-on-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            {t("signIn")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setError(null);
            }}
            className="text-secondary text-sm font-medium hover:underline"
          >
            {t("forgotPasswordResend")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
      <div className="mb-6 text-center sm:text-left">
        <h1 className="font-jakarta text-primary sm:text-headline-lg text-3xl font-bold">
          {t("forgotPasswordTitle")}
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm">{t("forgotPasswordSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="forgot-email"
            className="font-geist text-label-sm text-on-surface mb-1.5 block"
          >
            {t("email")}
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            lang={locale}
            className="border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-secondary/30 h-12 w-full rounded-xl border px-4 text-sm focus:ring-2"
            placeholder="name@example.com"
          />
        </div>

        {error && (
          <div className="border-error/20 bg-error-container text-error rounded-xl border px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <TurnstileWidget ref={turnstileRef} action="forgot-password" onToken={setTurnstileToken} />

        <button
          type="submit"
          disabled={loading || !turnstile.ready || (turnstile.enabled && !turnstileToken)}
          className="bg-primary text-on-primary h-12 w-full rounded-xl font-semibold transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t("processing") : t("forgotPasswordCta")}
        </button>
      </form>

      <p className="text-on-surface-variant mt-6 text-center text-sm">
        <Link href="/login" className="text-secondary font-semibold hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
