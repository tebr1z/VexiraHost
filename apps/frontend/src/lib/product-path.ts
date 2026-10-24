import type { CatalogProduct } from "@/features/catalog";

export function productPath(
  product: Pick<CatalogProduct, "slug" | "category" | "hostingPlanSlug" | "publicSlug">,
): string {
  const slug = encodeURIComponent(product.publicSlug || product.slug);
  return product.category === "HOSTING"
    ? `/hosting/${slug}`
    : `/products/item/${encodeURIComponent(product.publicSlug || product.slug)}`;
}
export const PERIOD_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  YEARLY: 12,
  ONE_TIME: 1,
};
export function productPeriods(product: CatalogProduct, currency: string) {
  const oneTime = product.category === "LICENSE" || product.billingCycle === "ONE_TIME";
  const periods = oneTime ? ["ONE_TIME"] : ["MONTHLY", "QUARTERLY", "SEMIANNUAL", "YEARLY"];
  const monthly = product.prices?.find(
    (row) => row.currency === currency && row.period === "MONTHLY",
  );
  const result = periods.flatMap((period) => {
    const row = product.prices?.find(
      (price) => price.currency === currency && price.period === period,
    );
    if (!row) return [];
    if (product.isFree)
      return [
        {
          ...row,
          salePrice: 0,
          originalPrice: 0,
          months: PERIOD_MONTHS[period]!,
          monthlyPrice: 0,
          savings: 0,
          savingsPercent: 0,
        },
      ];
    const months = PERIOD_MONTHS[period]!;
    const baseline = monthly ? monthly.salePrice * months : row.originalPrice;
    return [
      {
        ...row,
        months,
        monthlyPrice: row.salePrice / months,
        savings: Math.max(0, baseline - row.salePrice),
        savingsPercent:
          baseline > 0 ? Math.max(0, Math.round((1 - row.salePrice / baseline) * 100)) : 0,
      },
    ];
  });
  if (result.length || currency !== product.currency) return result;
  const period = oneTime ? "ONE_TIME" : product.billingCycle;
  const months = PERIOD_MONTHS[period] ?? 1;
  return [
    {
      currency,
      period,
      originalPrice: product.originalPrice ?? product.price,
      salePrice: product.price,
      discountPercent: product.discountPercent ?? 0,
      months,
      monthlyPrice: product.price / months,
      savings: 0,
      savingsPercent: 0,
    },
  ];
}
