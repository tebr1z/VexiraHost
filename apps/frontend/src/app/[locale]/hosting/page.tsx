import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seoPages");
  return buildPageMetadata({
    title: t("hostingTitle"),
    description: t("hostingDescription"),
    path: "/hosting",
  });
}

export default function PublicHostingPage(): React.ReactElement {
  return (
    <MarketingShell>
      <CmsPageView slug="hosting" />
    </MarketingShell>
  );
}
