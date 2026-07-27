"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CartYearlyUpsell } from "@/components/cart/cart-yearly-upsell";
import { PreferredCurrencyPicker } from "@/components/layout/preferred-currency-picker";
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
import { getCatalogProduct } from "@/features/catalog";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { getYearlyOfferFromProduct, isMonthlyBilling } from "@/lib/cart-pricing";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
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
  const [azLocked, setAzLocked] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [billingAddress, setBillingAddress] = useState<BillingAddressInput>(EMPTY_BILLING);
  const [editingBilling, setEditingBilling] = useState(false);
  const [skipBillingAddress, setSkipBillingAddress] = useState(false);
  const hasSavedBilling = isCompleteBillingAddress(user?.billingAddress ?? null);
  const showBillingForm = !skipBillingAddress && (!hasSavedBilling || editingBilling);
  const showBillingSection = isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      stashAuthNext("/cart");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || !quickAccount) return;
    void detectGeoCurrency().then((geo) => {
      setCountryCode(geo.countryCode);
      if (geo.countryCode === "AZ") {
        setAzLocked(true);
        setPreferredCurrency("AZN");
      } else {
        setPreferredCurrency(geo.currency);
      }
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
        const currency = (azLocked ? "AZN" : preferredCurrency) as AppCurrency;
        const session = await registerRequest(
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password,
            confirmPassword,
            preferredCurrency: currency,
            acceptedTerms: true,
          },
          locale,
          countryCode,
        );
        setSession(session);
        setFromUser({
          preferredCurrency: session.user.preferredCurrency ?? currency,
          billingPeriod: session.user.billingPeriod,
          currencyLocked: session.user.currencyLocked ?? azLocked,
        });
      }

      const result = await performCheckout(
        items,
        skipBillingAddress ? null : billingAddress,
        t("billingAddressRequired"),
        { requireBillingAddress: isAuthenticated && !skipBillingAddress },
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
          }),
        );
      }
    } finally {
      setLoading(false);
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

      <div className="bg-surface-container-low flex items-center justify-between rounded-2xl p-4">
        <span className="font-semibold">{t("total")}</span>
        <span className="text-xl font-bold">
          {formatMoney(total(), items[0]?.currency ?? "USD", locale)}
        </span>
      </div>

      {quickAccount && !isAuthenticated ? (
        <div className="border-outline-variant/50 bg-surface rounded-2xl border p-5">
          <h2 className="font-jakarta text-primary text-lg font-semibold">
            {t("quickAccountTitle")}
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">{t("quickAccountDesc")}</p>
          <div className="mt-4">
            <OAuthButtons />
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
                locked={azLocked}
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
        disabled={loading}
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
