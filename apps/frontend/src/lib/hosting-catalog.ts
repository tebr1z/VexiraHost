import type { CatalogCategory, CatalogProduct } from "@/features/catalog";
import type { HostingPlan } from "@/features/hosting";

export type BillingPeriod = "MONTHLY" | "YEARLY";

/** Same category key the home pricing section uses (catalog id or slug). */
export function resolveHostingCategoryRef(categories: CatalogCategory[]): string {
  const hosting =
    categories.find((c) => c.systemType?.toUpperCase() === "HOSTING") ??
    categories.find((c) => c.slug.toLowerCase() === "hosting");
  return hosting?.id ?? hosting?.slug ?? "HOSTING";
}

export function buildProductByHostingPlanSlug(
  products: CatalogProduct[],
): Map<string, CatalogProduct> {
  const map = new Map<string, CatalogProduct>();
  for (const product of products) {
    const slug = product.hostingPlanSlug?.trim().toLowerCase();
    if (slug) map.set(slug, product);
  }
  return map;
}

export function findCatalogProductForPlan(
  plan: HostingPlan,
  productBySlug: Map<string, CatalogProduct>,
): CatalogProduct | undefined {
  return productBySlug.get(plan.slug.trim().toLowerCase());
}

function normalizePeriod(period: string): BillingPeriod {
  return period.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
}

function productMatchesBillingPeriod(product: CatalogProduct, period: BillingPeriod): boolean {
  const cycle = product.billingCycle.toUpperCase();
  if (cycle === "ONE_TIME") return true;
  return cycle === period;
}

function hostingProductScore(product: CatalogProduct, period: BillingPeriod): number {
  let score = 0;
  const prices = product.prices ?? [];
  if (prices.some((row) => row.period === period)) score += 4;
  if (product.billingCycle.toUpperCase() === period) score += 3;
  if (
    prices.some((row) => row.period === "MONTHLY") &&
    prices.some((row) => row.period === "YEARLY")
  ) {
    score += 2;
  }
  return score;
}

export function pickHostingProductForPlan(
  products: CatalogProduct[],
  period: BillingPeriod,
): CatalogProduct | undefined {
  const eligible = products.filter((product) => productMatchesBillingPeriod(product, period));
  if (eligible.length === 0) return undefined;

  return [...eligible].sort(
    (a, b) => hostingProductScore(b, period) - hostingProductScore(a, period),
  )[0];
}

/** Hide monthly rows when yearly is selected (and vice versa); dedupe hosting by plan slug. */
export function filterCatalogProductsForPeriod(
  products: CatalogProduct[],
  period: BillingPeriod | string,
): CatalogProduct[] {
  const resolved = normalizePeriod(String(period));
  const periodFiltered = products.filter((product) =>
    productMatchesBillingPeriod(product, resolved),
  );

  const hostingBySlug = new Map<string, CatalogProduct[]>();
  const nonHosting: CatalogProduct[] = [];

  for (const product of periodFiltered) {
    if (product.category === "HOSTING" && product.hostingPlanSlug) {
      const slug = product.hostingPlanSlug.trim().toLowerCase();
      const bucket = hostingBySlug.get(slug) ?? [];
      bucket.push(product);
      hostingBySlug.set(slug, bucket);
    } else {
      nonHosting.push(product);
    }
  }

  const dedupedHosting: CatalogProduct[] = [];
  for (const bucket of hostingBySlug.values()) {
    const picked = pickHostingProductForPlan(bucket, resolved);
    if (picked) dedupedHosting.push(picked);
  }

  const order = new Map(products.map((product, index) => [product.id, index]));
  return [...nonHosting, ...dedupedHosting].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

/** Catalog product order matches the home page; only one sellable plan per hosting slug. */
export function mergePlansWithCatalogProducts(
  plans: HostingPlan[],
  products: CatalogProduct[],
  period: BillingPeriod | string = "MONTHLY",
): Array<{ plan: HostingPlan; product: CatalogProduct }> {
  const resolved = normalizePeriod(String(period));
  const planBySlug = new Map(plans.map((plan) => [plan.slug.trim().toLowerCase(), plan]));
  const productsBySlug = new Map<string, CatalogProduct[]>();

  for (const product of filterCatalogProductsForPeriod(products, resolved)) {
    const slug = product.hostingPlanSlug?.trim().toLowerCase();
    if (!slug) continue;
    const bucket = productsBySlug.get(slug) ?? [];
    bucket.push(product);
    productsBySlug.set(slug, bucket);
  }

  const merged: Array<{ plan: HostingPlan; product: CatalogProduct }> = [];
  const productOrder = new Map(products.map((product, index) => [product.id, index]));

  for (const [slug, slugProducts] of productsBySlug) {
    const plan = planBySlug.get(slug);
    const product = pickHostingProductForPlan(slugProducts, resolved);
    if (plan && product) merged.push({ plan, product });
  }

  merged.sort(
    (a, b) => (productOrder.get(a.product.id) ?? 0) - (productOrder.get(b.product.id) ?? 0),
  );

  return merged;
}
