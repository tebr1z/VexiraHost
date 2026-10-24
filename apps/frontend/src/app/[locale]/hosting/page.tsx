import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CmsSectionRenderer } from "@/components/cms/cms-section-renderer";
import { HostingFaq } from "@/components/hosting/hosting-faq";
import { HostingFeatureSections } from "@/components/hosting/hosting-feature-sections";
import { HostingIncludedStrip } from "@/components/hosting/hosting-included-strip";
import { HostingPlansSection } from "@/components/hosting/hosting-plans-section";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchCmsPage } from "@/features/cms/services/cms.service";
import type { PublicCmsSection } from "@/features/cms/types";
import { mergePlansWithCatalogProducts } from "@/lib/hosting-catalog";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqJsonLd,
  organizationJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { publicProducts, publicPlans } from "@/lib/server-catalog";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seoPages" });
  return buildPageMetadata({
    title: t("hostingTitle"),
    description: t("hostingDescription"),
    path: "/hosting",
    locale,
    keywords: ["web hosting", "NVMe hosting", "Plesk hosting", "SSL hosting", "Auto Deploy"],
  });
}

function faqItemsFromSections(sections: PublicCmsSection[]) {
  const faqSection = sections.find((section) => section.type === "FAQ");
  const items = faqSection?.content.items;
  return Array.isArray(items) ? (items as Array<{ question?: string; answer?: string }>) : [];
}

export default async function PublicHostingPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seoPages" });
  const [page, products, plans] = await Promise.all([
    fetchCmsPage("hosting", locale),
    publicProducts(),
    publicPlans(),
  ]);
  const entries = mergePlansWithCatalogProducts(
    plans,
    products.filter((product) => product.category === "HOSTING"),
  );
  const newLocale = locale === "de" || locale === "es";
  const th = await getTranslations({ locale, namespace: "publicHosting" });
  const faqData = faqJsonLd(
    newLocale
      ? ["q1", "q2", "q3", "q4"].map((key) => ({
          question: th(`faq.${key}.question`),
          answer: th(`faq.${key}.answer`),
        }))
      : faqItemsFromSections(page?.sections ?? []),
  );

  return (
    <MarketingShell>
      <JsonLd
        data={[
          organizationJsonLd(),
          serviceJsonLd({
            name: t("hostingTitle"),
            description: t("hostingDescription"),
            path: "/hosting",
            locale,
          }),
          breadcrumbJsonLd([
            { name: "Vexira Host", path: locale === "en" ? "/" : `/${locale}` },
            {
              name: t("hostingTitle"),
              path: locale === "en" ? "/hosting" : `/${locale}/hosting`,
            },
          ]),
          ...(faqData ? [faqData] : []),
        ]}
      />
      <HostingPlansSection initialData={entries} />
      {newLocale ? (
        <>
          <HostingIncludedStrip />
          <HostingFeatureSections />
          <HostingFaq />
        </>
      ) : (
        page?.sections
          .filter((section) => !["PLANS", "HERO"].includes(section.type))
          .map((section) => <CmsSectionRenderer key={section.id} section={section} />)
      )}
    </MarketingShell>
  );
}
