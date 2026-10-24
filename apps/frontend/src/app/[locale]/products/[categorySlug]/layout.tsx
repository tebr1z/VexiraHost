import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { buildPageMetadata } from "@/lib/seo";
import { publicCategories } from "@/lib/server-catalog";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const categories = await publicCategories(locale);
  const category = categories.find((row) => row.slug === categorySlug);
  if (!category) return { robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "productPurchase" });
  return buildPageMetadata({
    title: category.name,
    description: t("seoDescription", { name: category.name }),
    path: `/products/${encodeURIComponent(category.slug)}`,
    locale,
  });
}
export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
