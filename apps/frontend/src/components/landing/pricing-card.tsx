"use client";

import { useTranslations } from "next-intl";

import { HomeIcon } from "./home-icon";

import type { CatalogProduct } from "@/features/catalog";
import type { HostingPlan } from "@/features/hosting";
import { cn } from "@/lib/cn";

const CATEGORY_FEATURES: Record<string, string[]> = {
  HOSTING: ["f1", "f2", "f3"],
  VPS: ["f1", "f2", "f3"],
  DEDICATED: ["f1", "f2", "f3"],
  DOMAIN: ["f1", "f2"],
  SSL: ["f1", "f2"],
  EMAIL: ["f1", "f2", "f3"],
  LICENSE: ["f1", "f2", "f3"],
  BACKUP: ["f1", "f2"],
  WHATSAPP_API: ["f1", "f2", "f3"],
};
const PLAN_DESCRIPTIONS: Record<string, string> = {
  plus: "plusDescription",
  pro: "proDescription",
  "pro-plus": "proPlusDescription",
  business: "businessDescription",
};

// A stable storefront format prevents Node/browser ICU differences during hydration.
function formatPlanPrice(amount: number, currency: string): string {
  const number = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const symbol = ({ USD: "$", EUR: "€", AZN: "₼" } as Record<string, string>)[currency] ?? currency;
  return `${symbol} ${number}`;
}

export function PricingCard({
  product,
  featured,
  index,
  onSelect,
  plan,
  showDetails = false,
}: {
  product: CatalogProduct;
  featured?: boolean;
  index: number;
  onSelect: () => void;
  plan?: HostingPlan;
  showDetails?: boolean;
}): React.ReactElement {
  const t = useTranslations("pricing");
  const th = useTranslations("homeRedesign");
  const td = useTranslations("publicHosting");
  const cycle = product.category === "LICENSE" ? "ONE_TIME" : product.billingCycle.toUpperCase();
  const quoteOnly = Boolean(product.requiresQuote);
  const minimumQuantity = Math.max(1, product.minimumQuantity ?? 1);
  const lines =
    product.description
      ?.split(/\n|•/)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];
  const planDescription = plan ? PLAN_DESCRIPTIONS[plan.slug] : undefined;
  const featureKeys = CATEGORY_FEATURES[product.category] ?? [];
  const productFeatures = lines.slice(1, 6);
  const fallbackFeatureKeys = featureKeys.slice(0, Math.max(0, 3 - productFeatures.length));
  const specs = plan
    ? [
        { value: `${plan.diskGb} GB`, label: th("storage") },
        { value: String(plan.maxDomains), label: th("websites") },
        { value: String(plan.maxEmails), label: th("mailboxes") },
        ...(showDetails ? [{ value: `${plan.bandwidthGb} GB`, label: td("specBandwidth") }] : []),
        ...(plan.autoDeployEnabled
          ? [
              { value: `${plan.autoDeployDiskGb ?? 0} GB`, label: th("deployStorage") },
              { value: String(plan.autoDeployMaxApps ?? 0), label: th("deployApps") },
            ]
          : []),
        ...(showDetails && plan.autoDeployAiEnabled
          ? [{ value: String(plan.autoDeployAiMonthlyCredits ?? 0), label: td("specAiCredits") }]
          : []),
      ]
    : [];
  const billing =
    cycle === "QUARTERLY"
      ? t("quarterly")
      : cycle === "SEMIANNUAL"
        ? t("semiannual")
        : cycle === "YEARLY"
          ? t("yearly")
          : cycle === "ONE_TIME"
            ? t("oneTime")
            : t("monthly");
  const billingDetail =
    quoteOnly || cycle === "ONE_TIME"
      ? null
      : cycle === "QUARTERLY"
        ? t("quarterlyTotal")
        : cycle === "SEMIANNUAL"
          ? t("semiannualTotal")
          : cycle === "YEARLY"
            ? th("annualTotal")
            : th("monthlyTotal");

  return (
    <article className={cn("home-price-card", featured && "home-price-card-featured")}>
      <div className="home-plan-topline">
        <span className="home-plan-number">{String(index + 1).padStart(2, "0")}</span>
        {featured ? <span className="home-plan-recommended">{t("popular")}</span> : null}
      </div>
      <h3>{plan?.name ?? product.name}</h3>
      <p className="home-plan-description">
        {planDescription ? th(planDescription) : (lines[0] ?? "")}
      </p>
      <div className="home-plan-price">
        {quoteOnly ? (
          <div>
            <strong className="home-plan-quote">{t("quotePrice")}</strong>
          </div>
        ) : (
          <div>
            {(product.originalPrice ?? product.price) > product.price ? (
              <span className="mr-2 text-sm font-semibold text-[var(--label-tertiary)] line-through">
                {formatPlanPrice(product.originalPrice ?? product.price, product.currency)}
              </span>
            ) : null}
            <strong>{formatPlanPrice(product.price, product.currency)}</strong>
            <span>{billing}</span>
            {(product.discountPercent ?? 0) > 0 ? (
              <em className="bg-emerald-500/12 ml-2 inline-flex rounded-full px-2 py-1 text-xs font-bold not-italic text-emerald-700 dark:text-emerald-300">
                −{product.discountPercent}%
              </em>
            ) : null}
          </div>
        )}
        {billingDetail || minimumQuantity > 1 ? (
          <p>
            {[
              billingDetail,
              minimumQuantity > 1 ? t("minimumQuantity", { count: minimumQuantity }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>
      {plan ? (
        <ul className="home-plan-specs">
          {specs.map((spec) => (
            <li key={spec.label}>
              <HomeIcon name="check" />
              <span>
                <strong>{spec.value}</strong> {spec.label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="home-plan-specs">
          {productFeatures.map((line) => (
            <li key={line}>
              <HomeIcon name="check" />
              <span>{line}</span>
            </li>
          ))}
          {fallbackFeatureKeys.map((key) => (
            <li key={key}>
              <HomeIcon name="check" />
              <span>{t(`categoryFeatures.${product.category}.${key}` as never)}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "home-button home-plan-button",
          featured ? "home-button-primary" : "home-button-outline",
        )}
        aria-label={`${quoteOnly ? t("contactSales") : t("selectPlan")} — ${plan?.name ?? product.name}`}
      >
        {quoteOnly ? t("contactSales") : t("selectPlan")}
        <HomeIcon name="arrow" />
      </button>
    </article>
  );
}
