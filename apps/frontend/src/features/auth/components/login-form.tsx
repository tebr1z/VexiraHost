"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

import { createLoginSchema, type LoginFormValues } from "../schemas/auth.schema";
import { loginRequest } from "../services/auth.service";
import { OAuthButtons } from "./oauth-buttons";

export function LoginForm(): React.ReactElement {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

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
      router.push("/dashboard");
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("loginFailed");
      setError(message ?? t("loginFailed"));
    }
  };

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="font-jakarta text-3xl font-bold text-primary sm:text-headline-lg">
          {t("welcomeBack")}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant sm:text-body-md">{t("signInSubtitle")}</p>
      </div>

      <OAuthButtons />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant/40" />
        <span className="font-geist text-label-sm text-on-surface-variant">{t("orEmail")}</span>
        <div className="h-px flex-1 bg-outline-variant/40" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block font-geist text-label-sm text-on-surface">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-error">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block font-geist text-label-sm text-on-surface"
          >
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-error">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-secondary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30"
            {...register("rememberMe")}
          />
          {t("rememberMe")}
        </label>

        {error && (
          <div className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? t("signingIn") : t("signIn")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-secondary hover:underline">
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
