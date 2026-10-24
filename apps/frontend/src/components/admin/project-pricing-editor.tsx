"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HomeIcon } from "@/components/landing/home-icon";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { formatStorefrontMoney } from "@/lib/i18n/format";
import {
  PROJECT_PACKAGE_KEYS,
  PROJECT_FEATURE_KEYS,
  projectPackagePrice,
  type ProjectPackage,
  type ProjectPricingConfig,
  type ProjectPricingDocument,
} from "@/lib/project-quote";

function NumberField({
  label,
  value,
  onChange,
  max = 1000000,
  min = 0,
  integer = false,
  suffix = "AZN",
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  integer?: boolean;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="pp-field">
      <span>{label}</span>
      <span className="pp-input">
        <input
          type="number"
          required
          min={min}
          max={max}
          step={integer ? 1 : 0.01}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span>{suffix}</span>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function ProjectPricingEditor({
  initial,
  onSave,
}: {
  initial: ProjectPricingDocument;
  onSave: (
    config: ProjectPricingConfig,
    revision: string | null,
  ) => Promise<ProjectPricingDocument>;
}) {
  const t = useTranslations("projectPricingAdmin");
  const tq = useTranslations("projectQuote");
  const locale = useLocale();
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(() => structuredClone(initial.config));
  const [selected, setSelected] = useState<ProjectPackage>("company");
  const [tab, setTab] = useState<"packages" | "extras">("packages");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.config);
  const money = (value: number) => formatStorefrontMoney(value, "AZN", locale);
  const pack = draft.packages[selected];
  const salePrice = projectPackagePrice(pack);
  const patchPack = (patch: Partial<typeof pack>) => {
    setSaved(false);
    setDraft((old) => ({
      ...old,
      packages: { ...old.packages, [selected]: { ...old.packages[selected], ...patch } },
    }));
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form
      className="pp-admin"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setSaved(false);
        const invalid = PROJECT_PACKAGE_KEYS.find((key) => {
          const item = draft.packages[key];
          return (
            (item.discount.type === "percent" && item.discount.value > 100) ||
            (item.discount.type === "amount" && item.discount.value > item.price)
          );
        });
        if (invalid) {
          setSelected(invalid);
          setTab("packages");
          setError(t("invalidDiscount"));
          return;
        }
        setSaving(true);
        try {
          const result = await onSave(draft, baseline.updatedAt);
          setBaseline(result);
          setDraft(structuredClone(result.config));
          setSaved(true);
        } catch (err) {
          setError(getApiErrorMessage(err, t("failed"), { projectPricingChanged: t("conflict") }));
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="pp-heading">
        <div>
          <p className="pp-eyebrow">VEXIRA / {t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
        <span className={cn("pp-status", dirty && "pp-status-dirty")}>
          <i />
          {dirty ? t("unsaved") : t("upToDate")}
        </span>
      </div>
      <div className="pp-overview">
        <div>
          <HomeIcon name="layers" />
          <span>{t("packagesCount")}</span>
          <strong>6</strong>
        </div>
        <div>
          <HomeIcon name="sliders" />
          <span>{t("addonsCount")}</span>
          <strong>7</strong>
        </div>
        <div>
          <HomeIcon name="bolt" />
          <span>{t("discountsCount")}</span>
          <strong>
            {
              PROJECT_PACKAGE_KEYS.filter(
                (key) => projectPackagePrice(draft.packages[key]) < draft.packages[key].price,
              ).length
            }
          </strong>
        </div>
      </div>
      <div
        className="pp-tabs"
        role="tablist"
        aria-label={t("editorTabs")}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = tab === "packages" ? "extras" : "packages";
          setTab(next);
          document.getElementById(`pp-tab-${next}`)?.focus();
        }}
      >
        <button
          type="button"
          role="tab"
          id="pp-tab-packages"
          aria-selected={tab === "packages"}
          aria-controls="pp-panel-packages"
          onClick={() => setTab("packages")}
        >
          {t("packagesTab")}
        </button>
        <button
          type="button"
          role="tab"
          id="pp-tab-extras"
          aria-selected={tab === "extras"}
          aria-controls="pp-panel-extras"
          onClick={() => setTab("extras")}
        >
          {t("extrasTab")}
        </button>
      </div>
      <fieldset disabled={saving} className="pp-editor-body">
        <div className="pp-workspace">
          <div>
            {tab === "packages" ? (
              <section role="tabpanel" id="pp-panel-packages" aria-labelledby="pp-tab-packages">
                <div className="pp-package-grid">
                  {PROJECT_PACKAGE_KEYS.map((key) => {
                    const item = draft.packages[key];
                    const price = projectPackagePrice(item);
                    return (
                      <button
                        type="button"
                        key={key}
                        aria-pressed={selected === key}
                        className={cn("pp-package", selected === key && "pp-package-active")}
                        onClick={() => setSelected(key)}
                      >
                        <span>{tq(`packages.${key}.title`)}</span>
                        <strong>{money(price)}</strong>
                        <small>
                          {price < item.price ? (
                            <>
                              <del>{money(item.price)}</del>
                              <b>−{money(item.price - price)}</b>
                            </>
                          ) : (
                            t("none")
                          )}
                        </small>
                      </button>
                    );
                  })}
                </div>
                <div className="pp-panel">
                  <div className="pp-panel-heading">
                    <div>
                      <p className="pp-eyebrow">{t("editing")}</p>
                      <h2>{tq(`packages.${selected}.title`)}</h2>
                    </div>
                    <HomeIcon name="code" />
                  </div>
                  <div className="pp-fields">
                    <NumberField
                      label={t("basePrice")}
                      value={pack.price}
                      onChange={(price) => patchPack({ price })}
                    />
                    <label className="pp-field">
                      <span>{t("discountType")}</span>
                      <select
                        value={pack.discount.type}
                        onChange={(event) =>
                          patchPack({
                            discount: {
                              type: event.target.value as typeof pack.discount.type,
                              value: 0,
                            },
                          })
                        }
                      >
                        <option value="none">{t("none")}</option>
                        <option value="percent">{t("percent")}</option>
                        <option value="amount">{t("amount")}</option>
                      </select>
                    </label>
                    {pack.discount.type !== "none" && (
                      <NumberField
                        label={t("discountValue")}
                        value={pack.discount.value}
                        max={pack.discount.type === "percent" ? 100 : pack.price}
                        suffix={pack.discount.type === "percent" ? "%" : "AZN"}
                        onChange={(value) => patchPack({ discount: { ...pack.discount, value } })}
                      />
                    )}
                  </div>
                  <p className="pp-help">{t("discountHint")}</p>
                  <div className="pp-fields pp-fields-two">
                    <NumberField
                      label={t("includedPages")}
                      value={pack.pages}
                      min={1}
                      max={30}
                      integer
                      suffix={t("countUnit")}
                      onChange={(pages) => patchPack({ pages })}
                    />
                    <NumberField
                      label={t("supportMonths")}
                      value={pack.supportMonths}
                      max={36}
                      integer
                      suffix={t("monthUnit")}
                      hint={t("zeroDisables")}
                      onChange={(supportMonths) => patchPack({ supportMonths })}
                    />
                  </div>
                  <h3>{t("includedFeatures")}</h3>
                  <div className="pp-feature-grid">
                    {PROJECT_FEATURE_KEYS.map((key) => (
                      <label
                        key={key}
                        className={cn(
                          "pp-feature",
                          pack.included.includes(key) && "pp-feature-included",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={pack.included.includes(key)}
                          onChange={(event) =>
                            patchPack({
                              included: event.target.checked
                                ? [...pack.included, key]
                                : pack.included.filter((item) => item !== key),
                            })
                          }
                        />
                        <span>{tq(`features.${key}`)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="pp-help">{t("includedHint")}</p>
                </div>
              </section>
            ) : (
              <section
                role="tabpanel"
                id="pp-panel-extras"
                aria-labelledby="pp-tab-extras"
                className="pp-panel"
              >
                <div className="pp-panel-heading">
                  <div>
                    <p className="pp-eyebrow">{t("sharedRates")}</p>
                    <h2>{t("extrasTab")}</h2>
                  </div>
                  <HomeIcon name="sliders" />
                </div>
                <div className="pp-fields pp-fields-two">
                  <NumberField
                    label={t("extraPage")}
                    value={draft.extraPagePrice}
                    onChange={(extraPagePrice) => setDraft({ ...draft, extraPagePrice })}
                  />
                  <NumberField
                    label={t("extraLanguage")}
                    value={draft.extraLanguagePrice}
                    onChange={(extraLanguagePrice) => setDraft({ ...draft, extraLanguagePrice })}
                  />
                  {PROJECT_FEATURE_KEYS.map((key) => (
                    <NumberField
                      key={key}
                      label={tq(`features.${key}`)}
                      value={draft.features[key]}
                      onChange={(value) =>
                        setDraft({ ...draft, features: { ...draft.features, [key]: value } })
                      }
                    />
                  ))}
                </div>
                <h3>{t("gifts")}</h3>
                <p className="pp-help">{t("giftsHint")}</p>
                <div className="pp-fields pp-fields-two">
                  <NumberField
                    label={t("domainGift")}
                    value={draft.gifts.domainMonths}
                    max={36}
                    integer
                    suffix={t("monthUnit")}
                    onChange={(domainMonths) =>
                      setDraft({ ...draft, gifts: { ...draft.gifts, domainMonths } })
                    }
                  />
                  <NumberField
                    label={t("hostingGift")}
                    value={draft.gifts.hostingMonths}
                    max={36}
                    integer
                    suffix={t("monthUnit")}
                    onChange={(hostingMonths) =>
                      setDraft({ ...draft, gifts: { ...draft.gifts, hostingMonths } })
                    }
                  />
                </div>
              </section>
            )}
          </div>
          <aside className="pp-preview" aria-label={t("preview")}>
            <div className="pp-preview-label">
              <i />
              {t("preview")}
            </div>
            <h2>{tq(`packages.${selected}.title`)}</h2>
            <p>{tq(`packages.${selected}.description`, { pages: pack.pages })}</p>
            <div className="pp-preview-price" aria-live="polite">
              {salePrice < pack.price && <del>{money(pack.price)}</del>}
              <strong>{money(salePrice)}</strong>
              <span>{tq("oneTime")}</span>
            </div>
            {salePrice < pack.price && (
              <p className="pp-savings">
                <HomeIcon name="check" />
                {t("customerSaves", { amount: money(pack.price - salePrice) })}
              </p>
            )}
            <ul>
              <li>
                <HomeIcon name="check" />
                {t("pagesPreview", { count: pack.pages })}
              </li>
              {pack.included.map((key) => (
                <li key={key}>
                  <HomeIcon name="check" />
                  {tq(`features.${key}`)}
                </li>
              ))}
              {pack.supportMonths > 0 && (
                <li>
                  <HomeIcon name="support" />
                  {tq("giftSupport", { months: pack.supportMonths })}
                </li>
              )}
              {draft.gifts.domainMonths > 0 && (
                <li>
                  <HomeIcon name="globe" />
                  {tq("giftDomainMonths", { months: draft.gifts.domainMonths })}
                </li>
              )}
              {draft.gifts.hostingMonths > 0 && (
                <li>
                  <HomeIcon name="server" />
                  {tq("giftHostingMonths", { months: draft.gifts.hostingMonths })}
                </li>
              )}
            </ul>
            <p className="pp-help">{t("previewHint")}</p>
            <a
              href={`${locale === "en" ? "" : `/${locale}`}/project-quote?package=${selected}`}
              target="_blank"
              rel="noreferrer"
              className="pp-preview-link"
            >
              {t("openCalculator")}
              <HomeIcon name="arrow" />
            </a>
          </aside>
        </div>
      </fieldset>
      <div className="pp-savebar">
        <div aria-live="polite">
          <strong>
            {error ? t("notSaved") : dirty ? t("unsaved") : saved ? t("saved") : t("upToDate")}
          </strong>
          <p role={error ? "alert" : undefined}>
            {error ||
              (baseline.updatedAt
                ? t("savedAt", { date: new Date(baseline.updatedAt).toLocaleString(locale) })
                : t("defaultList"))}
          </p>
        </div>
        <div className="pp-actions">
          <button
            type="button"
            className="pp-btn pp-btn-secondary"
            disabled={saving || !dirty}
            onClick={() => {
              setDraft(structuredClone(baseline.config));
              setError("");
              setSaved(false);
            }}
          >
            {t("revert")}
          </button>
          <button
            type="submit"
            className="pp-btn pp-btn-primary"
            disabled={saving || (!dirty && baseline.updatedAt !== null)}
          >
            <HomeIcon name={saving ? "cloud" : "check"} />
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </form>
  );
}
