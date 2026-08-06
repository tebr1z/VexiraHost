"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuthHydration } from "../hooks/use-auth";
import { getSafeNextPath, goAfterAuth, stashAuthNext } from "../lib/auth-redirect";
import { createRegisterSchema, type RegisterFormValues } from "../schemas/auth.schema";
import { registerRequest } from "../services/auth.service";

import { AuthField } from "./auth-field";
import { OAuthButtons } from "./oauth-buttons";
import { PhoneCountryField } from "./phone-country-field";

import { PreferredCurrencyPicker } from "@/components/layout/preferred-currency-picker";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { composePhoneE164, findDialByIso2 } from "@/lib/phone/country-dial-codes";
import { useAuthStore } from "@/stores/auth-store";
import { detectGeoCurrency, usePricingStore, type AppCurrency } from "@/stores/pricing-store";

export function RegisterForm(): React.ReactElement {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const { isReady, isAuthenticated } = useAuthHydration();
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [azLocked, setAzLocked] = useState(false);
  const [urlNext, setUrlNext] = useState<string | null>(null);

  useEffect(() => {
    const next = getSafeNextPath(new URLSearchParams(window.location.search).get("next"));
    setUrlNext(next);
    if (next) stashAuthNext(next);
  }, []);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      goAfterAuth((href) => router.replace(href), urlNext);
    }
  }, [isReady, isAuthenticated, urlNext, router]);

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
        phoneInvalid: t("phoneInvalid"),
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
    defaultValues: {
      preferredCurrency: "USD",
      acceptedTerms: false,
      marketingOptIn: true,
      phoneDialIso2: "AZ",
      phoneNational: "",
    },
  });

  const preferredCurrency = watch("preferredCurrency");
  const phoneDialIso2 = watch("phoneDialIso2");
  const phoneNational = watch("phoneNational");

  useEffect(() => {
    void detectGeoCurrency().then((geo) => {
      setCountryCode(geo.countryCode);
      if (geo.countryCode === "AZ") {
        setAzLocked(true);
        setValue("preferredCurrency", "AZN");
      } else {
        setValue("preferredCurrency", geo.currency);
      }
      if (geo.countryCode && findDialByIso2(geo.countryCode)) {
        setValue("phoneDialIso2", geo.countryCode.toUpperCase());
      }
    });
  }, [setValue]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setError(null);
      const currency = (azLocked ? "AZN" : values.preferredCurrency) as AppCurrency;
      const dial = findDialByIso2(values.phoneDialIso2)?.dial ?? "994";
      const phone = composePhoneE164(dial, values.phoneNational ?? "");
      const session = await registerRequest(
        { ...values, preferredCurrency: currency, phone: phone ?? undefined },
        locale,
        countryCode,
      );
      setSession(session);
      setFromUser({
        preferredCurrency: session.user.preferredCurrency ?? currency,
        billingPeriod: session.user.billingPeriod,
        currencyLocked: session.user.currencyLocked ?? azLocked,
      });
      goAfterAuth((href) => router.push(href), urlNext);
    } catch (err) {
      setError(
        getApiErrorMessage(err, t("registerFailed"), {
          accountExists: t("accountExistsLogin"),
        }),
      );
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
          {t("createAccount")}
        </h1>
        <p className="text-on-surface-variant sm:text-body-md mt-2 text-sm">
          {t("registerSubtitle")}
        </p>
      </div>

      <OAuthButtons />

      <div className="my-6 flex items-center gap-3">
        <div className="bg-outline-variant/40 h-px flex-1" />
        <span className="font-geist text-label-sm text-on-surface-variant">{t("orEmail")}</span>
        <div className="bg-outline-variant/40 h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <AuthField
            label={t("firstName")}
            icon="person"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <AuthField
            label={t("lastName")}
            icon="badge"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <AuthField
          label={t("email")}
          icon="mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <PhoneCountryField
          label={t("phone")}
          optionalHint={t("phoneOptional")}
          dialIso2={phoneDialIso2 || "AZ"}
          nationalNumber={phoneNational ?? ""}
          onDialIso2Change={(iso2) => setValue("phoneDialIso2", iso2, { shouldValidate: true })}
          onNationalNumberChange={(value) =>
            setValue("phoneNational", value, { shouldValidate: true })
          }
          error={errors.phoneNational?.message}
        />

        <PreferredCurrencyPicker
          value={(preferredCurrency as AppCurrency) ?? "USD"}
          locked={azLocked}
          onChange={(next) => setValue("preferredCurrency", next)}
        />

        <AuthField
          label={t("password")}
          icon="lock"
          autoComplete="new-password"
          passwordToggle
          showPasswordLabel={t("showPassword")}
          hidePasswordLabel={t("hidePassword")}
          error={errors.password?.message}
          {...register("password")}
        />

        <AuthField
          label={t("confirmPassword")}
          icon="lock_reset"
          autoComplete="new-password"
          passwordToggle
          showPasswordLabel={t("showPassword")}
          hidePasswordLabel={t("hidePassword")}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <label className="text-on-surface-variant flex cursor-pointer items-start gap-2.5 rounded-2xl bg-[var(--bg-secondary)] px-3.5 py-3 text-sm">
          <input
            type="checkbox"
            className="border-outline-variant mt-0.5 h-4 w-4 rounded"
            {...register("marketingOptIn")}
          />
          <span>{t("marketingOptIn")}</span>
        </label>

        <label className="text-on-surface-variant flex cursor-pointer items-start gap-2.5 rounded-2xl bg-[var(--bg-secondary)] px-3.5 py-3 text-sm">
          <input
            type="checkbox"
            className="border-outline-variant mt-0.5 h-4 w-4 rounded"
            {...register("acceptedTerms")}
          />
          <span>
            {t("acceptTermsPrefix")}{" "}
            <Link href="/terms" className="text-secondary font-semibold hover:underline">
              {t("acceptTermsLink")}
            </Link>{" "}
            {t("acceptTermsAnd")}{" "}
            <Link href="/privacy" className="text-secondary font-semibold hover:underline">
              {t("privacyLink")}
            </Link>
            .
          </span>
        </label>
        {errors.acceptedTerms && (
          <p className="text-error px-1 text-sm">{errors.acceptedTerms.message}</p>
        )}

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
          {isSubmitting ? t("signingUp") : t("signUp")}
        </button>
      </form>

      <p className="text-on-surface-variant mt-6 text-center text-sm">
        {t("hasAccount")}{" "}
        <Link
          href={urlNext ? `/login?next=${encodeURIComponent(urlNext)}` : "/login"}
          className="text-secondary font-semibold hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
