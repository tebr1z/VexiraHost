import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProjectQuote } from "@/components/design/project-quote";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { isProjectPackage } from "@/lib/project-quote";
import { buildPageMetadata } from "@/lib/seo";
import { publicProjectPricing } from "@/lib/server-project-pricing";

import "@/styles/project-quote.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string; package?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projectQuote" });
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("description"),
    path: "/project-quote",
    locale,
  });
}
export default async function ProjectQuotePage({ searchParams }: Props) {
  const [query, pricing] = await Promise.all([searchParams, publicProjectPricing()]);
  const initialPackage =
    query.package && isProjectPackage(query.package)
      ? query.package
      : query.service === "mobile"
        ? "mobile"
        : query.service === "desktop"
          ? "desktop"
          : "landing";
  return (
    <MarketingShell variant="home">
      <ProjectQuote initialPackage={initialPackage} pricing={pricing} />
    </MarketingShell>
  );
}
