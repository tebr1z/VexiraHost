"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { CartYearlyUpsell } from "@/components/cart/cart-yearly-upsell";
import { AccessClosedNotice } from "@/components/layout/access-closed-notice";
import { PreferredCurrencyPicker } from "@/components/layout/preferred-currency-picker";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";
import { EmptyState } from "@/components/ui";
import { OAuthButtons } from "@/features/auth/components/oauth-buttons";
import { stashAuthNext } from "@/features/auth/lib/auth-redirect";
import { fetchProfile, registerRequest } from "@/features/auth/services/auth.service";
import {
  CheckoutValidationError,
  isCompleteBillingAddress,
  performCheckout,
  validateCartDomains,
  type BillingAddressInput,
} from "@/features/billing/lib/perform-checkout";
import { validatePromoCode } from "@/features/billing/services/billing.service";
import { getCatalogProduct } from "@/features/catalog";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getYearlyOfferFromProduct,
  isMonthlyBilling,
  resolveCheckoutPeriod,
} from "@/lib/cart-pricing";
import { formatMoney } from "@/lib/i18n/format";
import { pickLocalizedText } from "@/lib/localized-text";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useMaintenanceStore } from "@/stores/maintenance-store";
import { detectGeoCurrency, usePricingStore, type AppCurrency } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

const EMPTY_BILLING: BillingAddressInput = {
  fullName: "",
  line1: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

export function CartCheckoutView({
  quickAccount = false,
  emptyActionHref = "/#pricing",
}: {
  quickAccount?: boolean;
  emptyActionHref?: string;
}): React.ReactElement {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("cart");
  const tAuth = useTranslations("auth");
  const ta = useTranslations("access");
  const tv = useTranslations("validation");
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setPrimaryDomain = useCartStore((s) => s.setPrimaryDomain);
  const patchItem = useCartStore((s) => s.patchItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = useCartStore((s) => s.total);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const user = useAuthStore((s) => s.user);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState<AppCurrency>("USD");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstile = useMaintenanceStore((s) => s.turnstile);
  const access = useMaintenanceStore((s) => s.access);
  const [billingAddress, setBillingAddress] = useState<BillingAddressInput>(EMPTY_BILLING);
  const [editingBilling, setEditingBilling] = useState(false);
  const [skipBillingAddress, setSkipBillingAddress] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    messageKey: string;
    messageParams: Record<string, string | number>;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoProgress, setPromoProgress] = useState<{
    code: string;
    progressPercent: number;
    remainingAmount: number;
    minOrderAmount: number;
    potentialDiscount: number;
    currency: string;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const pricingCurrency = usePricingStore((s) => s.currency);
  const pricingPeriod = usePricingStore((s) => s.period);
  const hasSavedBilling = isCompleteBillingAddress(user?.billingAddress ?? null);
  const showBillingForm = !skipBillingAddress && (!hasSavedBilling || editingBilling);
  const showBillingSection = isAuthenticated;

  useEffect(() => {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoProgress(null);
  }, [items.map((i) => `${i.productId}:${i.quantity}:${i.price}`).join("|"), pricingCurrency]);

  useEffect(() => {
    if (!isAuthenticated) {
      stashAuthNext("/cart");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || !quickAccount) return;
    void detectGeoCurrency().then((geo) => {
      setCountryCode(geo.countryCode);
      // Soft default only — user can still pick another currency.
      setPreferredCurrency(geo.countryCode === "AZ" ? "AZN" : "USD");
    });
  }, [isAuthenticated, quickAccount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        if (accessToken && refreshToken) {
          setSession({
            user: profile,
            tokens: { accessToken, refreshToken, expiresIn: "15m" },
          });
        }
        if (isCompleteBillingAddress(profile.billingAddress)) {
          setBillingAddress(profile.billingAddress!);
          setEditingBilling(false);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isCompleteBillingAddress(user?.billingAddress)) {
      setBillingAddress(user!.billingAddress!);
    }
  }, [user?.billingAddress]);
  useEffect(() => {
    let cancelled = false;

    const enrichMonthlyItems = async () => {
      for (const item of items) {
        if (!isMonthlyBilling(item.billingCycle) || item.yearlyPrice) {
          continue;
        }
        try {
          const product = await getCatalogProduct(item.slug, {
            currency: item.currency,
            period: "MONTHLY",
          });
          if (cancelled) return;
          const offer = getYearlyOfferFromProduct(product);
          if (offer.yearlyPrice) {
            patchItem(item.productId, offer);
          }
        } catch {
          // ignore — upsell is optional
        }
      }
    };

    void enrichMonthlyItems();
    return () => {
      cancelled = true;
    };
  }, [items, patchItem]);

  const billingLabel = (cycle: string) =>
    cycle.toUpperCase() === "YEARLY" ? t("billingYearly") : t("billingMonthly");

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      validateCartDomains(items, {
        domainRequired: (name) => t("domainRequired", { name }),
        domainInvalid: (name) => t("domainInvalid", { name }),
      });

      if (quickAccount && !isAuthenticated) {
        if (!access.registerEnabled) {
          setError(ta("registerClosedHint"));
          setLoading(false);
          return;
        }
        if (!firstName.trim()) {
          setError(tv("firstNameRequired"));
          setLoading(false);
          return;
        }
        if (!lastName.trim()) {
          setError(tv("lastNameRequired"));
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setError(tv("emailRequired"));
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError(tv("passwordMin"));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(tv("passwordsMismatch"));
          setLoading(false);
          return;
        }
        if (!acceptedTerms) {
          setError(tAuth("acceptTermsRequired"));
          setLoading(false);
          return;
        }
        if (turnstile.enabled && !turnstileToken) {
          setError(tAuth("turnstileRequired"));
          setLoading(false);
          return;
        }
        const currency = preferredCurrency;
        const session = await registerRequest(
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phoneDialIso2: "AZ",
            phoneNational: "",
            password,
            confirmPassword,
            preferredCurrency: currency,
            acceptedTerms: true,
            marketingOptIn: true,
          },
          locale,
          countryCode,
          turnstileToken || undefined,
        );
        setSession(session);
        setFromUser({
          preferredCurrency: session.user.preferredCurrency ?? currency,
          billingPeriod: session.user.billingPeriod,
          currencyLocked: false,
        });
      }

      const result = await performCheckout(
        items,
        skipBillingAddress ? null : billingAddress,
        t("billingAddressRequired"),
        {
          requireBillingAddress: isAuthenticated && !skipBillingAddress,
          promoCode: appliedPromo?.code ?? null,
        },
      );

      try {
        const profile = await fetchProfile();
        const tokens = useAuthStore.getState();
        if (tokens.accessToken && tokens.refreshToken) {
          setSession({
            user: profile,
            tokens: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresIn: "15m",
            },
          });
        }
      } catch {
        // profile refresh is best-effort
      }

      if (result.redirectUrl) {
        clearCart();
        window.location.assign(result.redirectUrl);
        return;
      }

      clearCart();
      toast(t("paymentSuccess"), "success");

      router.push(`/dashboard/orders/${result.orderId}`);
    } catch (err) {
      if (err instanceof CheckoutValidationError) {
        setError(err.message);
      } else {
        setError(
          getApiErrorMessage(err, t("checkoutFailed"), {
            accountExists: tAuth("accountExistsLogin"),
            turnstileFailed: tAuth("turnstileFailed"),
          }),
        );
      }
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  const hostingItems = items.filter((item) => item.category === "HOSTING");

  if (items.length === 0) {
    return (
      <EmptyState title={t("empty")} actionLabel={t("emptyAction")} actionHref={emptyActionHref} />
    );
  }

  return (
    <div className="space-y-6">
      {hostingItems.length > 0 ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-elevated))] p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              {t("domainSectionBadge")}
            </p>
            <h2 className="font-jakarta text-primary mt-1 text-lg font-semibold">
              {t("domainSectionTitle")}
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">{t("domainSectionDesc")}</p>
          </div>
          <div className="space-y-4">
            {hostingItems.map((item) => (
              <div key={`domain-${item.productId}`}>
                <label
                  htmlFor={`cart-domain-${item.productId}`}
                  className="text-on-surface mb-1.5 block text-sm font-medium"
                >
                  {t("domainForPlan", { name: item.name })}
                </label>
                <input
                  id={`cart-domain-${item.productId}`}
                  value={item.primaryDomain ?? ""}
                  onChange={(e) => setPrimaryDomain(item.productId, e.target.value)}
                  placeholder={t("domainPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  className="border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-secondary/30 h-12 w-full rounded-xl border px-4 text-base font-medium tracking-wide focus:ring-2"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.productId}
            className="border-outline-variant/50 bg-surface rounded-2xl border p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-primary font-semibold">{item.name}</p>
                <p className="text-on-surface-variant text-sm">
                  {item.quantity} × {formatMoney(item.price, item.currency, locale)} /{" "}
                  {billingLabel(item.billingCycle)}
                </p>
                {item.category === "HOSTING" && item.primaryDomain?.trim() ? (
                  <p className="mt-1 text-sm text-[var(--accent)]">{item.primaryDomain.trim()}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="text-error text-sm hover:underline"
              >
                {t("remove")}
              </button>
            </div>

            <CartYearlyUpsell item={item} />
          </li>
        ))}
      </ul>

      <div className="border-outline-variant/40 bg-surface space-y-3 rounded-2xl border p-4">
        <p className="text-primary text-sm font-semibold">{t("promoTitle")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder={t("promoPlaceholder")}
            disabled={Boolean(appliedPromo)}
            className="border-outline-variant bg-surface-container-lowest h-11 flex-1 rounded-xl border px-4 text-sm uppercase tracking-wide disabled:opacity-60"
          />
          {appliedPromo ? (
            <button
              type="button"
              onClick={() => {
                setAppliedPromo(null);
                setPromoError(null);
                setPromoProgress(null);
                setPromoInput("");
              }}
              className="border-outline-variant inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold"
            >
              {t("promoRemove")}
            </button>
          ) : (
            <button
              type="button"
              disabled={promoLoading || !promoInput.trim()}
              onClick={async () => {
                setPromoLoading(true);
                setPromoError(null);
                setPromoProgress(null);
                try {
                  const period = resolveCheckoutPeriod(items, pricingPeriod);
                  const result = await validatePromoCode({
                    code: promoInput.trim(),
                    items: items.map((item) => ({
                      productId: item.productId,
                      quantity: item.quantity,
                    })),
                    currency: pricingCurrency,
                    period,
                  });
                  if (!result.valid) {
                    setAppliedPromo(null);
                    if (result.messageKey === "min_order") {
                      const currency = String(result.messageParams.currency ?? pricingCurrency);
                      setPromoProgress({
                        code: String(result.messageParams.code ?? promoInput.trim().toUpperCase()),
                        progressPercent: Number(result.messageParams.progressPercent ?? 0),
                        remainingAmount: Number(result.messageParams.remainingAmount ?? 0),
                        minOrderAmount: Number(result.messageParams.minOrderAmount ?? 0),
                        potentialDiscount: Number(result.messageParams.potentialDiscount ?? 0),
                        currency,
                      });
                      setPromoError(null);
                    } else {
                      setPromoProgress(null);
                      setPromoError(
                        promoMessageFromKey(t, result.messageKey, result.messageParams, locale),
                      );
                    }
                    return;
                  }
                  setAppliedPromo({
                    code: result.code ?? promoInput.trim().toUpperCase(),
                    discountAmount: result.discountAmount,
                    messageKey: result.messageKey,
                    messageParams: result.messageParams,
                  });
                  setPromoError(null);
                  setPromoProgress(null);
                } catch {
                  setPromoError(t("promoValidateFailed"));
                } finally {
                  setPromoLoading(false);
                }
              }}
              className="bg-primary text-on-primary inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
            >
              {t("promoApply")}
            </button>
          )}
        </div>
        {promoError ? <p className="text-error text-sm">{promoError}</p> : null}
        {promoProgress ? (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-amber-950 dark:text-amber-100">
                {t("promoMinOrderProgress", {
                  remaining: formatMoney(
                    promoProgress.remainingAmount,
                    promoProgress.currency,
                    locale,
                  ),
                  discount: formatMoney(
                    promoProgress.potentialDiscount,
                    promoProgress.currency,
                    locale,
                  ),
                })}
              </span>
              <span className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-200">
                {promoProgress.progressPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-amber-500/20">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, promoProgress.progressPercent))}%` }}
              />
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
              {t("promoMinOrderHint", {
                current: formatMoney(
                  Math.max(0, promoProgress.minOrderAmount - promoProgress.remainingAmount),
                  promoProgress.currency,
                  locale,
                ),
                min: formatMoney(promoProgress.minOrderAmount, promoProgress.currency, locale),
              })}
            </p>
          </div>
        ) : null}
        {appliedPromo ? (
          <p className="text-sm font-medium text-[var(--success)]">
            {t("promoAppliedAmount", {
              code: appliedPromo.code,
              discount: formatMoney(
                appliedPromo.discountAmount,
                items[0]?.currency ?? pricingCurrency,
                locale,
              ),
            })}
          </p>
        ) : null}
      </div>

      <div className="bg-surface-container-low space-y-2 rounded-2xl p-4">
        {appliedPromo ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">{t("promoSubtotal")}</span>
              <span>{formatMoney(total(), items[0]?.currency ?? "USD", locale)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--success)]">
              <span>
                {t("promoDiscount")} ({appliedPromo.code})
              </span>
              <span>
                −{formatMoney(appliedPromo.discountAmount, items[0]?.currency ?? "USD", locale)}
              </span>
            </div>
          </>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="font-semibold">{t("total")}</span>
          <span className="text-xl font-bold">
            {formatMoney(
              Math.max(0, total() - (appliedPromo?.discountAmount ?? 0)),
              items[0]?.currency ?? "USD",
              locale,
            )}
          </span>
        </div>
      </div>

      {quickAccount && !isAuthenticated ? (
        access.registerEnabled ? (
          <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
            <h2 className="font-jakarta text-primary text-lg font-semibold">
              {t("quickAccountTitle")}
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">{t("quickAccountDesc")}</p>
            {turnstile.enabled ? (
              <div className="mt-4">
                <TurnstileWidget ref={turnstileRef} action="signup" onToken={setTurnstileToken} />
              </div>
            ) : null}
            <div className="mt-4">
              <OAuthButtons
                intent="signup"
                turnstileToken={turnstileToken}
                disabled={turnstile.enabled && (!turnstile.ready || !turnstileToken)}
              />
            </div>
            <p className="text-on-surface-variant mt-4 text-sm">
              {t("alreadyHaveAccount")}{" "}
              <Link
                href="/login?next=%2Fcart"
                className="text-secondary font-semibold hover:underline"
              >
                {t("loginLink")}
              </Link>
            </p>
            <div className="my-4 flex items-center gap-3">
              <div className="bg-outline-variant/40 h-px flex-1" />
              <span className="text-on-surface-variant text-xs">{tAuth("orEmail")}</span>
              <div className="bg-outline-variant/40 h-px flex-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{tAuth("firstName")}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{tAuth("lastName")}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="family-name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{tAuth("email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="email"
                />
              </div>
              <div className="sm:col-span-2">
                <PreferredCurrencyPicker
                  value={preferredCurrency}
                  onChange={setPreferredCurrency}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{tAuth("password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{tAuth("confirmPassword")}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <label className="text-on-surface-variant mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="border-outline-variant mt-0.5 h-4 w-4 rounded"
              />
              <span>
                {tAuth("acceptTermsPrefix")}{" "}
                <Link href="/terms" className="text-secondary font-semibold hover:underline">
                  {tAuth("acceptTermsLink")}
                </Link>{" "}
                {tAuth("acceptTermsAnd")}{" "}
                <Link href="/privacy" className="text-secondary font-semibold hover:underline">
                  {tAuth("privacyLink")}
                </Link>
                .
              </span>
            </label>
          </div>
        ) : (
          <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
            <AccessClosedNotice
              compact
              message={pickLocalizedText(access.registerMessage, locale)}
            />
            {access.loginEnabled ? (
              <p className="text-on-surface-variant mt-4 text-center text-sm">
                {t("alreadyHaveAccount")}{" "}
                <Link
                  href="/login?next=/cart"
                  className="text-secondary font-semibold hover:underline"
                >
                  {tAuth("signIn")}
                </Link>
              </p>
            ) : null}
          </div>
        )
      ) : (
        isAuthenticated &&
        user && (
          <p className="text-on-surface-variant text-sm">
            {t("loggedInAs", { email: user.email })}
          </p>
        )
      )}

      {showBillingSection ? (
        <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-jakarta text-primary text-lg font-semibold">
                {t("billingAddressTitle")}
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                {skipBillingAddress
                  ? t("billingAddressSkippedDesc")
                  : hasSavedBilling && !editingBilling
                    ? t("billingAddressSavedDesc")
                    : t("billingAddressDesc")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {hasSavedBilling && !skipBillingAddress ? (
                <button
                  type="button"
                  onClick={() => {
                    if (editingBilling && isCompleteBillingAddress(user?.billingAddress)) {
                      setBillingAddress(user!.billingAddress!);
                    }
                    setEditingBilling((v) => !v);
                  }}
                  className="text-secondary text-sm font-semibold hover:underline"
                >
                  {editingBilling ? t("billingAddressCancelEdit") : t("billingAddressChange")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSkipBillingAddress((v) => !v);
                  setEditingBilling(false);
                }}
                className="border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-xl border px-3 py-1.5 text-sm font-medium transition"
              >
                {skipBillingAddress ? t("billingAddressAdd") : t("billingAddressSkip")}
              </button>
            </div>
          </div>

          {skipBillingAddress ? null : showBillingForm ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{t("billingFullName")}</label>
                <input
                  value={billingAddress.fullName}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{t("billingLine1")}</label>
                <input
                  value={billingAddress.line1}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, line1: e.target.value }))
                  }
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="address-line1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("billingCity")}</label>
                <input
                  value={billingAddress.city}
                  onChange={(e) => setBillingAddress((prev) => ({ ...prev, city: e.target.value }))}
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("billingRegion")}</label>
                <input
                  value={billingAddress.region}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, region: e.target.value }))
                  }
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="address-level1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("billingPostalCode")}</label>
                <input
                  value={billingAddress.postalCode}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, postalCode: e.target.value }))
                  }
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="postal-code"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("billingCountry")}</label>
                <input
                  value={billingAddress.country}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
                  autoComplete="country-name"
                />
              </div>
            </div>
          ) : (
            <div className="text-on-surface mt-4 space-y-1 text-sm">
              <p className="font-medium">{billingAddress.fullName}</p>
              <p>{billingAddress.line1}</p>
              <p>
                {[billingAddress.postalCode, billingAddress.city, billingAddress.region]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>{billingAddress.country}</p>
            </div>
          )}
        </div>
      ) : null}

      {error && (
        <p className="border-error/20 bg-error-container text-error rounded-xl border px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={
          loading ||
          (quickAccount &&
            !isAuthenticated &&
            (!turnstile.ready || (turnstile.enabled && !turnstileToken)))
        }
        onClick={handleCheckout}
        className="bg-primary text-on-primary h-12 w-full rounded-xl font-semibold disabled:opacity-60"
      >
        {loading
          ? t("processing")
          : quickAccount && !isAuthenticated
            ? t("checkoutPay")
            : t("checkoutPayNow")}
      </button>
    </div>
  );
}

type TranslateCart = (key: string, values?: Record<string, string | number>) => string;

function formatPromoDate(iso: string | number | undefined, locale: string): string {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

function promoMessageFromKey(
  t: TranslateCart,
  key: string,
  params: Record<string, string | number>,
  locale: string,
): string {
  const currency = String(params.currency ?? params.cartCurrency ?? "USD");
  switch (key) {
    case "not_found":
      return t("promoNotFound");
    case "inactive":
      return t("promoInactive");
    case "not_started":
      return t("promoNotStarted", { date: formatPromoDate(params.startsAt, locale) });
    case "expired":
      return t("promoExpired");
    case "currency_mismatch":
      return t("promoCurrencyMismatch", {
        currency: String(params.currency ?? ""),
        cartCurrency: String(params.cartCurrency ?? ""),
      });
    case "min_order":
      return t("promoMinOrder", {
        amount: formatMoney(Number(params.minOrderAmount ?? 0), currency, locale),
      });
    case "not_applicable":
      return t("promoNotApplicable");
    case "limit_total":
      return t("promoLimitTotal");
    case "limit_user":
      return t("promoLimitUser");
    default:
      return t("promoValidateFailed");
  }
}
