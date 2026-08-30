import type { CatalogCategory, CatalogProduct } from "@/features/catalog";
import type { HostingPlan } from "@/features/hosting";

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

/** Catalog product order matches the home page; only sellable linked plans are shown. */
export function mergePlansWithCatalogProducts(
  plans: HostingPlan[],
  products: CatalogProduct[],
): Array<{ plan: HostingPlan; product: CatalogProduct }> {
  const planBySlug = new Map(plans.map((plan) => [plan.slug.trim().toLowerCase(), plan]));
  const merged: Array<{ plan: HostingPlan; product: CatalogProduct }> = [];

  for (const product of products) {
    const slug = product.hostingPlanSlug?.trim().toLowerCase();
    if (!slug) continue;
    const plan = planBySlug.get(slug);
    if (plan) merged.push({ plan, product });
  }

  return merged;
}
