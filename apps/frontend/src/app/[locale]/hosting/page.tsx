import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchCmsPage } from "@/features/cms/services/cms.service";
import type { PublicCmsSection } from "@/features/cms/types";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqJsonLd,
  organizationJsonLd,
  serviceJsonLd,
} from "@/lib/seo";

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
  const page = await fetchCmsPage("hosting", locale);
  const faqData = faqJsonLd(faqItemsFromSections(page?.sections ?? []));

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
      <CmsPageView slug="hosting" initialPage={page} />
    </MarketingShell>
  );
}
