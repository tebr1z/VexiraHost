"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { detectGeoCurrency, usePricingStore, type AppCurrency } from "@/stores/pricing-store";

import { createRegisterSchema, type RegisterFormValues } from "../schemas/auth.schema";
import { registerRequest } from "../services/auth.service";
import { OAuthButtons } from "./oauth-buttons";

export function RegisterForm(): React.ReactElement {
  const t = useTranslations("auth");
  const tp = useTranslations("pricing");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [azLocked, setAzLocked] = useState(false);

  const schema = useMemo(
    () =>
      createRegisterSchema({
        emailRequired: tv("emailRequired"),
        passwordMin: tv("passwordMin"),
        firstNameRequired: tv("firstNameRequired"),
        lastNameRequired: tv("lastNameRequired"),
        confirmPasswordRequired: tv("confirmPassword"),
        passwordsMismatch: tv("passwordsMismatch"),
        acceptTermsRequired: t("acceptTermsRequired"),
      }),
    [tv, t],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { preferredCurrency: "USD", acceptedTerms: false },
  });

  const preferredCurrency = watch("preferredCurrency");

  useEffect(() => {
    void detectGeoCurrency().then((geo) => {
      setCountryCode(geo.countryCode);
      if (geo.countryCode === "AZ") {
        setAzLocked(true);
        setValue("preferredCurrency", "AZN");
      } else {
        setValue("preferredCurrency", geo.currency);
      }
    });
  }, [setValue]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setError(null);
      const currency = (azLocked ? "AZN" : values.preferredCurrency) as AppCurrency;
      const session = await registerRequest(
        { ...values, preferredCurrency: currency },
        locale,
        countryCode,
      );
      setSession(session);
      setFromUser({
        preferredCurrency: session.user.preferredCurrency ?? currency,
        billingPeriod: session.user.billingPeriod,
        currencyLocked: session.user.currencyLocked ?? azLocked,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(
        getApiErrorMessage(err, t("registerFailed"), {
          accountExists: t("accountExistsLogin"),
        }),
      );
    }
  };

  return (
    <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="font-jakarta text-3xl font-bold text-primary sm:text-headline-lg">
          {t("createAccount")}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant sm:text-body-md">{t("registerSubtitle")}</p>
      </div>

      <OAuthButtons />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant/40" />
        <span className="font-geist text-label-sm text-on-surface-variant">{t("orEmail")}</span>
        <div className="h-px flex-1 bg-outline-variant/40" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block font-geist text-label-sm">
              {t("firstName")}
            </label>
            <input
              id="firstName"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              {...register("firstName")}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1.5 block font-geist text-label-sm">
              {t("lastName")}
            </label>
            <input
              id="lastName"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              {...register("lastName")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block font-geist text-label-sm">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="preferredCurrency" className="mb-1.5 block font-geist text-label-sm">
            {tp("preferredCurrency")}
          </label>
          <select
            id="preferredCurrency"
            disabled={azLocked}
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm disabled:opacity-70"
            {...register("preferredCurrency")}
            value={preferredCurrency}
            onChange={(e) => setValue("preferredCurrency", e.target.value as AppCurrency)}
          >
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="AZN">AZN — Azərbaycan manatı</option>
          </select>
          <p className="mt-1.5 text-xs text-on-surface-variant">
            {azLocked ? tp("azLocked") : tp("registerCurrencyHint")}
          </p>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block font-geist text-label-sm">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-error">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block font-geist text-label-sm">
            {t("confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-outline-variant"
              {...register("acceptedTerms")}
            />
            <span>
              {t("acceptTermsPrefix")}{" "}
              <Link href="/terms" className="font-semibold text-secondary hover:underline">
                {t("acceptTermsLink")}
              </Link>{" "}
              {t("acceptTermsAnd")}{" "}
              <Link href="/privacy" className="font-semibold text-secondary hover:underline">
                {t("privacyLink")}
              </Link>
              .
            </span>
          </label>
          {errors.acceptedTerms && (
            <p className="mt-1 text-sm text-error">{errors.acceptedTerms.message}</p>
          )}
        </div>

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
          {isSubmitting ? t("signingUp") : t("signUp")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-secondary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
