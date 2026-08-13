import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  DataTransferSection,
  HeroSection,
  HomeJourney,
  InfrastructureSection,
  PricingSection,
} from "@/components/landing";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    keywords: t.raw("keywords") as string[],
  });
}

export default async function HomePage(): Promise<React.ReactElement> {
  const t = await getTranslations("meta");

  return (
    <MarketingShell>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(t("description"))]} />
      <HeroSection />
      <HomeJourney />
      <PricingSection />
      <InfrastructureSection />
      <DataTransferSection />
    </MarketingShell>
  );
}
