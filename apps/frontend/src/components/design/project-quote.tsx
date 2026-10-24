"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { InquiryForm } from "@/components/contact/inquiry-form";
import { HomeIcon } from "@/components/landing/home-icon";
import { cn } from "@/lib/cn";
import { formatStorefrontMoney } from "@/lib/i18n/format";
import {
  estimateProject,
  PROJECT_PACKAGES,
  PROJECT_FEATURES,
  projectPackagePrice,
  type ProjectPricingDocument,
  type ProjectPackage,
  type ProjectFeature,
} from "@/lib/project-quote";

export function ProjectQuote({
  initialPackage,
  pricing,
}: {
  initialPackage: ProjectPackage;
  pricing: ProjectPricingDocument | null;
}) {
  const t = useTranslations("projectQuote");
  if (!pricing)
    return (
      <div className="home-container project-quote-page">
        <h1>{t("title")}</h1>
        <p role="alert" className="project-quote-note">
          {t("unavailable")}
        </p>
        <button
          type="button"
          className="home-button home-button-primary"
          onClick={() => window.location.reload()}
        >
          {t("refreshPricing")}
        </button>
      </div>
    );
  return <ProjectQuoteCalculator initialPackage={initialPackage} pricing={pricing} />;
}
function ProjectQuoteCalculator({
  initialPackage,
  pricing,
}: {
  initialPackage: ProjectPackage;
  pricing: ProjectPricingDocument;
}) {
  const t = useTranslations("projectQuote");
  const locale = useLocale();
  const config = pricing.config;
  const [selected, setSelected] = useState(initialPackage);
  const [pages, setPages] = useState<number>(config.packages[initialPackage].pages);
  const [languages, setLanguages] = useState(1);
  const [features, setFeatures] = useState<ProjectFeature[]>([]);
  const pack = { ...config.packages[selected], service: PROJECT_PACKAGES[selected].service };
  const included: readonly string[] = pack.included;
  const estimate = estimateProject({ package: selected, pages, languages, features }, config);
  const money = (value: number) => formatStorefrontMoney(value, "AZN", locale);
  const selectPackage = (key: ProjectPackage) => {
    setSelected(key);
    setPages(config.packages[key].pages);
    setFeatures([]);
  };
  const gifts = [
    ...(config.gifts.domainMonths > 0
      ? [
          config.gifts.domainMonths === 12
            ? t("giftDomain")
            : t("giftDomainMonths", { months: config.gifts.domainMonths }),
        ]
      : []),
    ...(config.gifts.hostingMonths > 0
      ? [
          config.gifts.hostingMonths === 12
            ? t("giftHosting")
            : t("giftHostingMonths", { months: config.gifts.hostingMonths }),
        ]
      : []),
    ...(estimate.supportMonths > 0 ? [t("giftSupport", { months: estimate.supportMonths })] : []),
  ];
  const summary = [
    `${t("packageLabel")}: ${t(`packages.${selected}.title`)} — ${money(estimate.base)}`,
    `${t(pack.service === "web" ? "pages" : "screens")}: ${estimate.pages} (+${money(estimate.extraPages)})`,
    `${t("languages")}: ${estimate.languages} (+${money(estimate.extraLanguages)})`,
    ...included.map((key) => `${t(`features.${key}`)}: ${t("included")}`),
    ...estimate.features.map((key) => `${t(`features.${key}`)}: +${money(config.features[key])}`),
    `${t("estimate")}: ${money(estimate.total)} (${t("oneTime")})`,
    ...gifts,
    t("terms"),
    t("estimateNote"),
  ].join("\n");

  return (
    <div className="home-container project-quote-page">
      <header className="project-quote-heading">
        <p className="home-eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      <div className="project-quote-grid">
        <div className="project-quote-options">
          <fieldset className="project-quote-section">
            <legend>
              <span>01</span>
              {t("chooseType")}
            </legend>
            <div className="project-quote-packages">
              {(Object.keys(PROJECT_PACKAGES) as ProjectPackage[]).map((key) => (
                <label
                  key={key}
                  className={cn("project-package", selected === key && "is-selected")}
                >
                  <input
                    type="radio"
                    name="project-package"
                    checked={selected === key}
                    onChange={() => selectPackage(key)}
                  />
                  <span className="project-package-top">
                    <strong>{t(`packages.${key}.title`)}</strong>
                    {projectPackagePrice(config.packages[key]) < config.packages[key].price && (
                      <span className="project-price-before">
                        <del>{money(config.packages[key].price)}</del>
                        <b>
                          {config.packages[key].discount.type === "percent"
                            ? `−${config.packages[key].discount.value}%`
                            : `−${money(config.packages[key].discount.value)}`}
                        </b>
                      </span>
                    )}
                    <span>
                      {t("from", { price: money(projectPackagePrice(config.packages[key])) })}
                    </span>
                  </span>
                  <span className="project-package-description">
                    {t(`packages.${key}.description`, { pages: config.packages[key].pages })}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="project-quote-section">
            <legend>
              <span>02</span>
              {t("customize")}
            </legend>
            <div className="project-quote-counts">
              <label htmlFor="project-pages">
                {t(pack.service === "web" ? "pages" : "screens")}
                <input
                  id="project-pages"
                  type="number"
                  min={pack.pages}
                  max={30}
                  value={pages}
                  onChange={(event) => setPages(Number(event.target.value))}
                  onBlur={() => setPages(estimate.pages)}
                />
                <small>
                  {t("pageHint", { count: pack.pages, price: money(config.extraPagePrice) })}
                </small>
              </label>
              <label htmlFor="project-languages">
                {t("languages")}
                <select
                  id="project-languages"
                  value={languages}
                  onChange={(event) => setLanguages(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                      {t("languageCount", { count })}
                    </option>
                  ))}
                </select>
                <small>{t("languageHint", { price: money(config.extraLanguagePrice) })}</small>
              </label>
            </div>
            <div className="project-quote-features">
              {(Object.keys(PROJECT_FEATURES) as ProjectFeature[]).map((key) => (
                <label key={key} className="project-quote-feature">
                  <input
                    type="checkbox"
                    checked={included.includes(key) || features.includes(key)}
                    disabled={included.includes(key)}
                    onChange={(event) =>
                      setFeatures(
                        event.target.checked
                          ? [...features, key]
                          : features.filter((item) => item !== key),
                      )
                    }
                  />
                  <span>{t(`features.${key}`)}</span>
                  <strong>
                    {included.includes(key) ? t("included") : `+${money(config.features[key])}`}
                  </strong>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <aside id="project-summary" className="project-quote-summary" aria-label={t("summary")}>
          <p className="home-eyebrow">{t("summary")}</p>
          <h2>{t(`packages.${selected}.title`)}</h2>
          <p className="project-quote-total" aria-live="polite" aria-atomic="true">
            {estimate.discountAmount > 0 && (
              <del className="project-total-before">
                {money(estimate.total + estimate.discountAmount)}
              </del>
            )}
            {money(estimate.total)}
            <span>{t("oneTime")}</span>
          </p>
          <p className="project-quote-note">{t("estimateNote")}</p>
          <dl className="project-quote-breakdown">
            <div>
              <dt>{t("base")}</dt>
              <dd>{money(estimate.originalBase)}</dd>
            </div>
            {estimate.discountAmount > 0 && (
              <div className="project-discount-line">
                <dt>{t("discount")}</dt>
                <dd>−{money(estimate.discountAmount)}</dd>
              </div>
            )}
            {estimate.extraPages > 0 && (
              <div>
                <dt>{t("extraPages")}</dt>
                <dd>+{money(estimate.extraPages)}</dd>
              </div>
            )}
            {estimate.extraLanguages > 0 && (
              <div>
                <dt>{t("extraLanguages")}</dt>
                <dd>+{money(estimate.extraLanguages)}</dd>
              </div>
            )}
            {estimate.features.map((key) => (
              <div key={key}>
                <dt>{t(`features.${key}`)}</dt>
                <dd>+{money(config.features[key])}</dd>
              </div>
            ))}
          </dl>
          {gifts.length > 0 && (
            <div className="project-quote-gifts">
              <strong>{t("gifts")}</strong>
              {gifts.map((gift) => (
                <p key={gift}>
                  <HomeIcon name="check" />
                  {gift}
                </p>
              ))}
            </div>
          )}
          <a className="home-button home-button-primary" href="#project-inquiry">
            {t("getProposal")}
            <HomeIcon name="arrow" />
          </a>
          <p className="project-quote-note">{t("terms")}</p>
        </aside>
        <section
          id="project-inquiry"
          className="project-quote-section"
          aria-labelledby="project-inquiry-title"
        >
          <h2 id="project-inquiry-title">
            <span>03</span>
            {t("briefTitle")}
          </h2>
          <p className="project-quote-note">{t("briefDescription")}</p>
          <InquiryForm
            kind="contact"
            context={{
              subject: t("subject"),
              message: summary,
              projectQuote: {
                package: selected,
                pages: estimate.pages,
                languages: estimate.languages,
                features: estimate.features,
                pricingUpdatedAt: pricing.updatedAt,
              },
            }}
            submitLabel={t("submit")}
          />
        </section>
      </div>
      <div className="project-quote-mobile-total">
        <a href="#project-summary">
          <span>{t("estimate")}</span>
          <strong aria-live="polite">{money(estimate.total)}</strong>
        </a>
        <a className="home-button home-button-primary" href="#project-inquiry">
          {t("getProposal")}
          <HomeIcon name="arrow" />
        </a>
      </div>
    </div>
  );
}
