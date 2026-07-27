"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuthHydration } from "../hooks/use-auth";
import { goAfterAuth, getSafeNextPath, stashAuthNext } from "../lib/auth-redirect";
import { createLoginSchema, type LoginFormValues } from "../schemas/auth.schema";
import { loginRequest } from "../services/auth.service";

import { AuthField } from "./auth-field";
import { OAuthButtons } from "./oauth-buttons";

import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

function LoginFormInner(): React.ReactElement {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const setSession = useAuthStore((s) => s.setSession);
  const { isReady, isAuthenticated } = useAuthHydration();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nextPath) stashAuthNext(nextPath);
  }, [nextPath]);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      goAfterAuth((href) => router.replace(href), nextPath);
    }
  }, [isReady, isAuthenticated, nextPath, router]);

  const schema = useMemo(
    () =>
      createLoginSchema({
        emailRequired: tv("emailRequired"),
        passwordMin: tv("passwordMin"),
      }),
    [tv],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setError(null);
      const session = await loginRequest(values, locale);
      setSession(session, { rememberMe: values.rememberMe });
      goAfterAuth((href) => router.push(href), nextPath);
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("loginFailed");
      setError(message ?? t("loginFailed"));
    }
  };

  if (!isReady || isAuthenticated) {
    return (
      <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="text-on-surface-variant text-center text-sm">{t("signingIn")}</p>
      </div>
    );
  }

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="font-jakarta text-primary sm:text-headline-lg text-3xl font-bold">
          {t("welcomeBack")}
        </h1>
        <p className="text-on-surface-variant sm:text-body-md mt-2 text-sm">
          {t("signInSubtitle")}
        </p>
      </div>

      <OAuthButtons />

      <div className="my-6 flex items-center gap-3">
        <div className="bg-outline-variant/40 h-px flex-1" />
        <span className="font-geist text-label-sm text-on-surface-variant">{t("orEmail")}</span>
        <div className="bg-outline-variant/40 h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <AuthField
          label={t("email")}
          icon="mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          label={t("password")}
          icon="lock"
          autoComplete="current-password"
          passwordToggle
          showPasswordLabel={t("showPassword")}
          hidePasswordLabel={t("hidePassword")}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between gap-3 px-0.5 pt-0.5">
          <label className="text-on-surface-variant flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="border-outline-variant text-primary focus:ring-primary/30 h-4 w-4 rounded"
              {...register("rememberMe")}
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="text-secondary shrink-0 text-sm font-medium hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {error && (
          <div className="border-error/20 bg-error-container text-error rounded-xl border px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-on-primary mt-1 h-12 w-full rounded-2xl font-semibold transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? t("signingIn") : t("signIn")}
        </button>
      </form>

      <p className="text-on-surface-variant mt-6 text-center text-sm">
        {t("noAccount")}{" "}
        <Link
          href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"}
          className="text-secondary font-semibold hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}

export function LoginForm(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
          <p className="text-on-surface-variant text-center text-sm">…</p>
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
