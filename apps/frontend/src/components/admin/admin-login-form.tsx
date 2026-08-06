"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { ADMIN_PANEL_PATH } from "@/components/admin/admin-nav-config";
import { BrandLogo } from "@/components/brand/brand-logo";
import { createLoginSchema, type LoginFormValues } from "@/features/auth/schemas/auth.schema";
import { isLoginTwoFactorChallenge, loginRequest } from "@/features/auth/services/auth.service";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";

export function AdminLoginForm(): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("admin.login");
  const ta = useTranslations("auth");
  const tv = useTranslations("validation");
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
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
      const result = await loginRequest(values);
      if (isLoginTwoFactorChallenge(result)) {
        setError(
          "Two-factor authentication is enabled. Sign in at /login with your authenticator code, then open the admin panel.",
        );
        return;
      }
      const role = result.user.role;

      if (role !== "admin" && role !== "staff") {
        clearSession();
        setError(t("denied"));
        return;
      }

      setSession(result, { rememberMe: values.rememberMe });
      router.push(ADMIN_PANEL_PATH);
    } catch (err) {
      setError(getApiErrorMessage(err, t("loginFailed")));
    }
  };

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <BrandLogo href="/" className="mx-auto mb-4 justify-center" />
        <h1 className="font-jakarta text-primary text-3xl font-bold">{t("title")}</h1>
        <p className="text-on-surface-variant mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="admin-email" className="text-on-surface mb-1.5 block text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            className="border-outline-variant/40 focus:border-secondary focus:ring-secondary/30 h-12 w-full rounded-xl border bg-white/70 px-4 text-sm shadow-inner focus:ring-2"
            {...register("email")}
          />
          {errors.email && <p className="text-error mt-1 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="text-on-surface mb-1.5 block text-sm font-medium"
          >
            {t("password")}
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            className="border-outline-variant/40 focus:border-secondary focus:ring-secondary/30 h-12 w-full rounded-xl border bg-white/70 px-4 text-sm shadow-inner focus:ring-2"
            {...register("password")}
          />
          {errors.password && <p className="text-error mt-1 text-sm">{errors.password.message}</p>}
        </div>

        <label className="text-on-surface-variant flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="border-outline-variant text-primary focus:ring-primary/30 h-4 w-4 rounded"
            {...register("rememberMe")}
          />
          {ta("rememberMe")}
        </label>

        {error && (
          <div className="border-error/20 bg-error-container text-error rounded-xl border px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-on-primary h-12 w-full rounded-xl font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>

      <Link
        href="/"
        className="text-secondary mt-6 flex items-center justify-center gap-1 text-sm hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        {t("backToSite")}
      </Link>
    </div>
  );
}
