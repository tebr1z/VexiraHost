"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { resetPasswordRequest } from "@/features/auth/services/auth.service";

export default function ResetPasswordPage(): React.ReactElement {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t("resetPasswordNoToken"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordMin8"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    try {
      setLoading(true);
      await resetPasswordRequest({ token, password, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t("resetPasswordFailed")));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
        <h1 className="font-jakarta text-3xl font-bold text-primary sm:text-headline-lg">
          {t("resetPasswordTitle")}
        </h1>
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {t("resetPasswordSuccess")}
        </div>
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

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
      <h1 className="font-jakarta text-3xl font-bold text-primary sm:text-headline-lg">
        {t("resetPasswordTitle")}
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">{t("resetPasswordSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("confirmPassword")}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-on-primary disabled:opacity-60"
        >
          {loading ? t("processing") : t("resetPasswordCta")}
        </button>
      </form>
    </div>
  );
}
