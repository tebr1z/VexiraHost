import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HeroSection, HomeJourney, PricingSection } from "@/components/landing";
import { HomeDevelopmentSection } from "@/components/landing/home-development-section";
import { HomeFaqSection } from "@/components/landing/home-faq-section";
import { HomePlatformSection } from "@/components/landing/home-platform-section";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { listCatalogCategories, listCatalogProducts } from "@/features/catalog";
import { listHostingPlans } from "@/features/hosting";
import { buildPageMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

// Keep the crawlable plan catalog fresh after an admin changes public pricing.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale,
    absoluteTitle: true,
    keywords: t.raw("keywords") as string[],
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  const t = await getTranslations("meta");
  const [categories, products, plans] = await Promise.allSettled([
    listCatalogCategories(locale),
    listCatalogProducts({ category: "HOSTING", currency: "USD", period: "MONTHLY" }),
    listHostingPlans(),
  ]);
  const initialData =
    categories.status === "fulfilled" &&
    products.status === "fulfilled" &&
    plans.status === "fulfilled"
      ? { categories: categories.value, products: products.value, plans: plans.value }
      : undefined;

  return (
    <MarketingShell variant="home">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(t("description"))]} />
      <HeroSection />
      <PricingSection initialData={initialData} />
      <HomePlatformSection />
      <HomeDevelopmentSection />
      <HomeJourney />
      <HomeFaqSection />
    </MarketingShell>
  );
}
