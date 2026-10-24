"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HostingDomainPicker } from "./hosting-domain-picker";

import { HomeIcon } from "@/components/landing/home-icon";
import { getCatalogProduct, type CatalogProduct } from "@/features/catalog";
import { convertAmount } from "@/features/catalog/services/exchange-rates.service";
import type { HostingPlan } from "@/features/hosting";
import { useExchangeRates } from "@/hooks/use-display-money";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import type { HostingDomainChoice } from "@/lib/hosting-domain";
import { formatStorefrontMoney } from "@/lib/i18n/format";
import { productPeriods } from "@/lib/product-path";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";

export function ProductConfigurator({
  initialProduct,
  plan,
}: {
  initialProduct: CatalogProduct;
  plan?: HostingPlan;
}) {
  const t = useTranslations("productPurchase");
  const td = useTranslations("hostingDomain");
  const [domainStep, setDomainStep] = useState(initialProduct.category === "HOSTING");
  const [domainChoice, setDomainChoice] = useState<HostingDomainChoice>();
  const th = useTranslations("homeRedesign");
  const locale = useLocale();
  const rates = useExchangeRates();
  const router = useRouter();
  const currency = usePricingStore((s) => s.currency);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const currencyLocked = usePricingStore((s) => s.currencyLocked);
  const setPeriod = usePricingStore((s) => s.setPeriod);
  const [product, setProduct] = useState(initialProduct);
  const [selectedPeriod, selectPeriod] = useState("MONTHLY");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getCatalogProduct(initialProduct.slug, { currency, period: "MONTHLY" })
      .then((value) => {
        if (!cancelled) setProduct(value);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currency, initialProduct.slug, t]);
  const options = productPeriods(product, product.currency);
  const selected = options.find((row) => row.period === selectedPeriod) ?? options[0];
  const money = (value: number) => formatStorefrontMoney(value, product.currency, locale);
  const addToCart = async () => {
    if (product.category === "HOSTING" && !domainChoice) {
      setDomainStep(true);
      return;
    }
    if (!selected || loading || adding) return;
    setAdding(true);
    setError("");
    try {
      // Checkout has one billing period per order. Reprice recurring items together, before any cart mutation.
      const cart = useCartStore.getState();
      const recurring =
        selected.period !== "ONE_TIME"
          ? cart.items.filter(
              (item) =>
                item.productId !== product.id &&
                item.category !== "LICENSE" &&
                item.billingCycle !== "ONE_TIME",
            )
          : [];
      const updated = await Promise.all(
        recurring.map((item) =>
          getCatalogProduct(item.slug, { currency: product.currency, period: selected.period }),
        ),
      );
      if (
        updated.some(
          (item) => item.billingCycle !== selected.period || item.currency !== product.currency,
        )
      )
        throw new Error("period");
      const fresh = await getCatalogProduct(product.slug, {
        currency: product.currency,
        period: selected.period,
      });
      if (fresh.billingCycle !== selected.period || fresh.currency !== product.currency)
        throw new Error("period");
      for (const item of updated) cart.patchItem(item.id, buildCartItemFromProduct(item));
      if (selected.period !== "ONE_TIME")
        setPeriod(selected.period as "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY");
      cart.addItem({
        ...buildCartItemFromProduct(fresh),
        ...(domainChoice ? { primaryDomain: domainChoice.name, domainChoice } : {}),
      });
      router.push("/cart");
    } catch {
      setError(t("loadFailed"));
    } finally {
      setAdding(false);
    }
  };
  const specs = plan
    ? [
        { icon: "database" as const, value: `${plan.diskGb} GB`, label: th("storage") },
        { icon: "globe" as const, value: `${plan.maxDomains}`, label: th("websites") },
        { icon: "mail" as const, value: `${plan.maxEmails}`, label: th("mailboxes") },
        { icon: "bolt" as const, value: `${plan.bandwidthGb} GB`, label: t("bandwidth") },
        ...(plan.autoDeployEnabled
          ? [
              {
                icon: "code" as const,
                value: `${plan.autoDeployDiskGb ?? 0} GB`,
                label: th("deployStorage"),
              },
              {
                icon: "layers" as const,
                value: `${plan.autoDeployMaxApps ?? 0}`,
                label: th("deployApps"),
              },
            ]
          : []),
      ]
    : [];
  return (
    <div className="purchase-page home-container">
      <nav aria-label={t("breadcrumb")} className="purchase-breadcrumb">
        <Link href="/">Vexira Host</Link>
        <span>/</span>
        <Link href={plan ? "/hosting" : "/#pricing"}>{t("allPlans")}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      {product.category === "HOSTING" && (
        <ol className="hosting-purchase-steps" aria-label={td("steps")}>
          <li aria-current={domainStep ? "step" : undefined}>
            <span>1</span>
            {td("title")}
          </li>
          <li aria-current={!domainStep ? "step" : undefined}>
            <span>2</span>
            {t("chooseTerm")}
          </li>
          <li>
            <span>3</span>
            {td("cart")}
          </li>
        </ol>
      )}
      <div className="purchase-grid">
        <section className="purchase-information">
          <span className="purchase-eyebrow">
            <HomeIcon name={plan ? "server" : "layers"} />
            {plan?.panel ?? product.category.replaceAll("_", " ")}
          </span>
          <h1>{product.name}</h1>
          <p className="purchase-description">
            {plan ? t("hostingDescription") : product.description?.split("\n")[0]}
          </p>
        </section>
        <section
          className="purchase-configurator"
          aria-labelledby="purchase-term-title"
          aria-busy={loading}
        >
          {domainStep && product.category === "HOSTING" ? (
            <>
              <div className="purchase-configurator-heading">
                <div>
                  <span className="purchase-eyebrow">{td("firstStep")}</span>
                  <h2 id="purchase-term-title">{td("title")}</h2>
                </div>
                <HomeIcon name="globe" />
              </div>
              <HostingDomainPicker
                key={product.currency}
                currency={product.currency}
                initial={domainChoice}
                busy={loading || adding}
                onConfirm={(value) => {
                  setDomainChoice(value);
                  setDomainStep(false);
                }}
              />
            </>
          ) : (
            <>
              {domainChoice && (
                <div className="hosting-selected-domain">
                  <div>
                    <strong>{domainChoice.name}</strong>
                    <small>
                      {td(domainChoice.mode)}
                      {domainChoice.price > 0
                        ? ` · ${formatStorefrontMoney(domainChoice.price, domainChoice.currency, locale)} / ${td("year")}`
                        : ""}
                    </small>
                  </div>
                  <button type="button" onClick={() => setDomainStep(true)}>
                    {td("change")}
                  </button>
                </div>
              )}
              <div className="purchase-configurator-heading">
                <div>
                  <span className="purchase-eyebrow">{t("step")}</span>
                  <h2 id="purchase-term-title">{t("chooseTerm")}</h2>
                </div>
                <select
                  aria-label={t("currency")}
                  value={currency}
                  disabled={currencyLocked || adding}
                  onChange={(event) => setCurrency(event.target.value as "USD" | "EUR" | "AZN")}
                >
                  {["USD", "EUR", "AZN"].map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
              </div>
              <p className="purchase-muted">{t("termDescription")}</p>
              <div
                className="purchase-terms"
                role="radiogroup"
                aria-labelledby="purchase-term-title"
              >
                {options.map((option) => (
                  <label
                    key={option.period}
                    className={`purchase-term ${selected?.period === option.period ? "is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="billing-term"
                      value={option.period}
                      checked={selected?.period === option.period}
                      onChange={() => selectPeriod(option.period)}
                      disabled={loading || adding}
                    />
                    <span className="purchase-term-copy">
                      <strong>
                        {option.period === "ONE_TIME"
                          ? t("oneTime")
                          : t("months", { count: option.months })}
                      </strong>
                      <small>
                        {option.period === "ONE_TIME"
                          ? t("oneTime")
                          : t("monthlyEquivalent", { price: money(option.monthlyPrice) })}
                      </small>
                    </span>
                    <span className="purchase-term-price">
                      <strong>{money(option.salePrice)}</strong>
                      {option.savingsPercent > 0 && (
                        <em>{t("savePercent", { percent: option.savingsPercent })}</em>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              {!selected && <p role="status">{t("unavailable")}</p>}
              <div className="purchase-total">
                <span>{t("dueToday")}</span>
                <strong>
                  {selected
                    ? money(
                        selected.salePrice * Math.max(1, product.minimumQuantity ?? 1) +
                          (domainChoice
                            ? convertAmount(
                                domainChoice.price,
                                domainChoice.currency,
                                product.currency === "AZN" || product.currency === "EUR"
                                  ? product.currency
                                  : "USD",
                                rates,
                              )
                            : 0),
                      )
                    : "—"}
                </strong>
              </div>
              {selected && selected.savings > 0 && (
                <p className="purchase-saving">
                  {t("savingAmount", { amount: money(selected.savings) })}
                </p>
              )}
              {product.minimumQuantity && product.minimumQuantity > 1 ? (
                <p className="purchase-muted">
                  {t("minimumQuantity", { count: product.minimumQuantity })}
                </p>
              ) : null}
              <p className="purchase-muted purchase-period-note">{t("sharedPeriod")}</p>
              {error && (
                <p role="alert" className="text-error">
                  {error}
                </p>
              )}
              {product.requiresQuote ? (
                <Link href="/contact" className="purchase-cta">
                  {t("contactSales")}
                </Link>
              ) : (
                <button
                  type="button"
                  className="purchase-cta"
                  onClick={addToCart}
                  disabled={loading || adding || !selected}
                >
                  {adding ? t("adding") : t("addToCart")}
                  <HomeIcon name="arrow" />
                </button>
              )}
            </>
          )}
          <p className="purchase-secure">
            <HomeIcon name="shield" />
            {t("secureCheckout")}
          </p>
        </section>
        <section className="purchase-resources">
          {specs.length > 0 && (
            <div className="purchase-specs">
              {specs.map((spec) => (
                <div key={spec.label}>
                  <HomeIcon name={spec.icon} />
                  <strong>{spec.value}</strong>
                  <span>{spec.label}</span>
                </div>
              ))}
            </div>
          )}
          {plan && (
            <div className="purchase-benefits">
              <h2>{t("included")}</h2>
              <ul>
                {[t("benefitSsl"), t("benefitSupport"), t("benefitPanel")].map((text) => (
                  <li key={text}>
                    <HomeIcon name="check" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
