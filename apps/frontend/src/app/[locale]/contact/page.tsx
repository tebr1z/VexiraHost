import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InquiryForm } from "@/components/contact/inquiry-form";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seoPages");
  return buildPageMetadata({
    title: t("contactTitle"),
    description: t("contactDescription"),
    path: "/contact",
  });
}

export default async function ContactPage(): Promise<React.ReactElement> {
  const t = await getTranslations("inquiry");

  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-5 py-16">
        <h1 className="font-jakarta text-primary text-3xl font-bold">{t("contactTitle")}</h1>
        <p className="text-on-surface-variant mt-3 text-sm">{t("contactSubtitle")}</p>
        <div className="mt-8">
          <InquiryForm kind="contact" />
        </div>
      </div>
    </MarketingShell>
  );
}
