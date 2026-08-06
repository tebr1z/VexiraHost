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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/" },
  };
}

export default async function HomePage(): Promise<React.ReactElement> {
  const t = await getTranslations("meta");
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vexirahost.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Vexira Host",
        url: siteUrl,
        logo: `${siteUrl}/favicon.png`,
      },
      {
        "@type": "WebSite",
        name: "Vexira Host",
        url: siteUrl,
        description: t("description"),
      },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HeroSection />
      <HomeJourney />
      <PricingSection />
      <InfrastructureSection />
      <DataTransferSection />
    </MarketingShell>
  );
}
