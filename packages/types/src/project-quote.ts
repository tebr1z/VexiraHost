/** Public starting prices in AZN. Estimates are confirmed after reviewing the brief. */
export const PROJECT_PACKAGES = {
  landing: { service: "web", price: 399, pages: 1, supportMonths: 6, included: [] },
  company: { service: "web", price: 799, pages: 5, supportMonths: 6, included: ["cms"] },
  store: {
    service: "web",
    price: 1499,
    pages: 8,
    supportMonths: 12,
    included: ["cms", "payments", "account"],
  },
  platform: {
    service: "web",
    price: 2499,
    pages: 8,
    supportMonths: 12,
    included: ["cms", "account"],
  },
  mobile: {
    service: "mobile",
    price: 2999,
    pages: 5,
    supportMonths: 12,
    included: ["account", "api"],
  },
  desktop: { service: "desktop", price: 1999, pages: 5, supportMonths: 12, included: [] },
} as const;
export type ProjectPackage = keyof typeof PROJECT_PACKAGES;
export const PROJECT_FEATURES = {
  cms: 150,
  booking: 200,
  payments: 200,
  account: 200,
  api: 250,
} as const;
export type ProjectFeature = keyof typeof PROJECT_FEATURES;
export const EXTRA_PAGE_PRICE = 35;
export const EXTRA_LANGUAGE_PRICE = 100;

export interface ProjectDiscount {
  type: "none" | "percent" | "amount";
  value: number;
}
export interface ProjectPackagePrice {
  price: number;
  discount: ProjectDiscount;
  pages: number;
  supportMonths: number;
  included: ProjectFeature[];
}
export interface ProjectPricingConfig {
  schemaVersion: 1;
  currency: "AZN";
  packages: Record<ProjectPackage, ProjectPackagePrice>;
  features: Record<ProjectFeature, number>;
  extraPagePrice: number;
  extraLanguagePrice: number;
  gifts: { domainMonths: number; hostingMonths: number };
}
export interface ProjectPricingDocument {
  config: ProjectPricingConfig;
  updatedAt: string | null;
}
export interface ProjectSelection {
  package: ProjectPackage;
  pages: number;
  languages: number;
  features: ProjectFeature[];
}
export interface ProjectQuoteRequest extends ProjectSelection {
  pricingUpdatedAt: string | null;
}

export const PROJECT_PACKAGE_KEYS = Object.keys(PROJECT_PACKAGES) as ProjectPackage[];
export const PROJECT_FEATURE_KEYS = Object.keys(PROJECT_FEATURES) as ProjectFeature[];
export function defaultProjectPricing(): ProjectPricingConfig {
  return {
    schemaVersion: 1,
    currency: "AZN",
    packages: Object.fromEntries(
      PROJECT_PACKAGE_KEYS.map((key) => {
        const { service: _service, ...pack } = PROJECT_PACKAGES[key];
        return [
          key,
          { ...pack, included: [...pack.included], discount: { type: "none", value: 0 } },
        ];
      }),
    ) as ProjectPricingConfig["packages"],
    features: { ...PROJECT_FEATURES },
    extraPagePrice: EXTRA_PAGE_PRICE,
    extraLanguagePrice: EXTRA_LANGUAGE_PRICE,
    gifts: { domainMonths: 12, hostingMonths: 12 },
  };
}
const cents = (value: number) => Math.round(value * 100);
export function projectPackagePrice(pack: ProjectPackagePrice): number {
  const original = cents(pack.price);
  const reduction =
    pack.discount.type === "percent"
      ? Math.round((original * pack.discount.value) / 100)
      : pack.discount.type === "amount"
        ? cents(pack.discount.value)
        : 0;
  return Math.max(0, original - reduction) / 100;
}
export function isProjectPackage(value: string): value is ProjectPackage {
  return Object.hasOwn(PROJECT_PACKAGES, value);
}
export function estimateProject(input: ProjectSelection, config = defaultProjectPricing()) {
  const pack = config.packages[input.package];
  const pages = Math.max(
    pack.pages,
    Math.min(30, Number.isFinite(input.pages) ? Math.floor(input.pages) : pack.pages),
  );
  const languages = Math.max(
    1,
    Math.min(6, Number.isFinite(input.languages) ? Math.floor(input.languages) : 1),
  );
  const features = [...new Set(input.features)].filter(
    (key) => Object.hasOwn(config.features, key) && !pack.included.includes(key),
  );
  const extraPages = (pages - pack.pages) * cents(config.extraPagePrice);
  const extraLanguages = (languages - 1) * cents(config.extraLanguagePrice);
  const extras = features.reduce((sum, key) => sum + cents(config.features[key]), 0);
  const base = projectPackagePrice(pack);
  return {
    base,
    originalBase: pack.price,
    discountAmount: (cents(pack.price) - cents(base)) / 100,
    pages,
    languages,
    features,
    extraPages: extraPages / 100,
    extraLanguages: extraLanguages / 100,
    extras: extras / 100,
    total: (cents(base) + extraPages + extraLanguages + extras) / 100,
    supportMonths: pack.supportMonths,
  };
}
