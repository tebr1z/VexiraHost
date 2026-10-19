import type { CatalogProduct } from "@/features/catalog";
import type { CartItem } from "@/stores/cart-store";

export function isMonthlyBilling(billingCycle: string): boolean {
  return billingCycle.toUpperCase() === "MONTHLY";
}

export function getYearlyOfferFromProduct(product: CatalogProduct): {
  yearlyPrice?: number;
  yearlySavingsPercent?: number;
} {
  if (product.category === "LICENSE" || product.yearlyAvailable === false) {
    return {};
  }
  if (!isMonthlyBilling(product.billingCycle)) {
    return {};
  }

  const yearly = product.prices?.find(
    (p) => p.currency === product.currency && p.period === "YEARLY",
  );
  const savings = product.yearlySavingsPercent ?? 0;

  if (!yearly || savings <= 0) {
    return {};
  }

  return {
    yearlyPrice: yearly.salePrice,
    yearlySavingsPercent: savings,
  };
}

export function buildCartItemFromProduct(
  product: CatalogProduct,
): Omit<CartItem, "quantity" | "primaryDomain"> {
  if (product.requiresQuote) {
    throw new Error("Quote-only products cannot be added to the cart");
  }
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    currency: product.currency,
    billingCycle: product.category === "LICENSE" ? "ONE_TIME" : product.billingCycle,
    category: product.category,
    hostingPlanSlug: product.hostingPlanSlug,
    minimumQuantity: Math.max(1, product.minimumQuantity ?? 1),
    ...getYearlyOfferFromProduct(product),
  };
}

export function hasYearlyUpsell(item: CartItem): boolean {
  return (
    item.category !== "LICENSE" &&
    isMonthlyBilling(item.billingCycle) &&
    typeof item.yearlyPrice === "number" &&
    (item.yearlySavingsPercent ?? 0) > 0
  );
}

export function resolveCheckoutPeriod(items: CartItem[], fallback: string): string {
  items = items.filter(
    (item) => item.category !== "LICENSE" && item.billingCycle.toUpperCase() !== "ONE_TIME",
  );
  if (items.length === 0) {
    return fallback;
  }
  const cycles = [...new Set(items.map((item) => item.billingCycle.toUpperCase()))];
  if (cycles.length === 1) {
    return ["QUARTERLY", "SEMIANNUAL", "YEARLY"].includes(cycles[0] ?? "") ? cycles[0]! : "MONTHLY";
  }
  return fallback;
}
