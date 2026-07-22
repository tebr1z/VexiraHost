"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CartYearlyUpsell } from "@/components/cart/cart-yearly-upsell";
import { EmptyState } from "@/components/ui";
import {
  CheckoutValidationError,
  isCompleteBillingAddress,
  performCheckout,
  validateCartDomains,
  type BillingAddressInput,
} from "@/features/billing/lib/perform-checkout";
import { fetchProfile, registerRequest } from "@/features/auth/services/auth.service";
import { getCatalogProduct } from "@/features/catalog";
import { getApiErrorMessage } from "@/lib/api-error";
import { getYearlyOfferFromProduct, isMonthlyBilling } from "@/lib/cart-pricing";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [billingAddress, setBillingAddress] = useState<BillingAddressInput>(EMPTY_BILLING);
  const [editingBilling, setEditingBilling] = useState(false);
  const hasSavedBilling = isCompleteBillingAddress(user?.billingAddress ?? null);
  const showBillingForm = !hasSavedBilling || editingBilling;

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
        if (!email.trim() || password.length < 8) {
          setError(t("accountFieldsRequired"));
          setLoading(false);
          return;
        }
        if (!acceptedTerms) {
          setError(tAuth("acceptTermsRequired"));
          setLoading(false);
          return;
        }
        const session = await registerRequest(
          {
            email: email.trim(),
            password,
            confirmPassword: password,
            preferredCurrency: (items[0]?.currency ?? "USD") as "USD" | "EUR" | "AZN",
            acceptedTerms: true,
          },
          locale,
        );
        setSession(session);
      }

      const result = await performCheckout(items, billingAddress, t("billingAddressRequired"));

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

  if (items.length === 0) {
    return (
      <EmptyState title={t("empty")} actionLabel={t("emptyAction")} actionHref={emptyActionHref} />
    );
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.productId}
            className="rounded-2xl border border-outline-variant/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-primary">{item.name}</p>
                <p className="text-sm text-on-surface-variant">
                  {item.quantity} × {formatMoney(item.price, item.currency, locale)} /{" "}
                  {billingLabel(item.billingCycle)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="text-sm text-error hover:underline"
              >
                {t("remove")}
              </button>
            </div>

            <CartYearlyUpsell item={item} />

            {item.category === "HOSTING" && (
              <div className="mt-4">
                <label className="mb-1.5 block text-sm text-on-surface-variant">{t("primaryDomain")}</label>
                <input
                  value={item.primaryDomain ?? ""}
                  onChange={(e) => setPrimaryDomain(item.productId, e.target.value)}
                  placeholder={t("domainPlaceholder")}
                  className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
        <span className="font-semibold">{t("total")}</span>
        <span className="text-xl font-bold">{formatMoney(total(), items[0]?.currency ?? "USD", locale)}</span>
      </div>

      {items.some((item) => item.category === "HOSTING") && (
        <p className="text-sm text-on-surface-variant">{t("hostingNote")}</p>
      )}

      {quickAccount && !isAuthenticated ? (
        <div className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
          <h2 className="font-jakarta text-lg font-semibold text-primary">{t("quickAccountTitle")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("quickAccountDesc")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-on-surface-variant">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-secondary hover:underline">
              {t("loginLink")}
            </Link>
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-outline-variant"
            />
            <span>
              {tAuth("acceptTermsPrefix")}{" "}
              <Link href="/terms" className="font-semibold text-secondary hover:underline">
                {tAuth("acceptTermsLink")}
              </Link>{" "}
              {tAuth("acceptTermsAnd")}{" "}
              <Link href="/privacy" className="font-semibold text-secondary hover:underline">
                {tAuth("privacyLink")}
              </Link>
              .
            </span>
          </label>
        </div>
      ) : (
        isAuthenticated &&
        user && (
          <p className="text-sm text-on-surface-variant">
            {t("loggedInAs", { email: user.email })}
          </p>
        )
      )}

      <div className="rounded-2xl border border-outline-variant/50 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-jakarta text-lg font-semibold text-primary">{t("billingAddressTitle")}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {hasSavedBilling && !editingBilling
                ? t("billingAddressSavedDesc")
                : t("billingAddressDesc")}
            </p>
          </div>
          {hasSavedBilling ? (
            <button
              type="button"
              onClick={() => {
                if (editingBilling && isCompleteBillingAddress(user?.billingAddress)) {
                  setBillingAddress(user!.billingAddress!);
                }
                setEditingBilling((v) => !v);
              }}
              className="text-sm font-semibold text-secondary hover:underline"
            >
              {editingBilling ? t("billingAddressCancelEdit") : t("billingAddressChange")}
            </button>
          ) : null}
        </div>

        {showBillingForm ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("billingFullName")}</label>
              <input
                value={billingAddress.fullName}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, fullName: e.target.value }))}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("billingLine1")}</label>
              <input
                value={billingAddress.line1}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, line1: e.target.value }))}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="address-line1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("billingCity")}</label>
              <input
                value={billingAddress.city}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, city: e.target.value }))}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="address-level2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("billingRegion")}</label>
              <input
                value={billingAddress.region}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, region: e.target.value }))}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
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
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="postal-code"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("billingCountry")}</label>
              <input
                value={billingAddress.country}
                onChange={(e) => setBillingAddress((prev) => ({ ...prev, country: e.target.value }))}
                className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm"
                autoComplete="country-name"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-1 text-sm text-on-surface">
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

      {error && (
        <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleCheckout}
        className="h-12 w-full rounded-xl bg-primary font-semibold text-on-primary disabled:opacity-60"
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
