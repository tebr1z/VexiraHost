import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InquiryForm } from "@/components/contact/inquiry-form";
import { HomeIcon } from "@/components/landing/home-icon";
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
      <div className="public-inquiry-layout">
        <header className="public-page-heading">
          <p>VEXIRA HOST</p>
          <h1>{t("contactTitle")}</h1>
          <p>{t("contactSubtitle")}</p>
          <div className="public-inquiry-note">
            <HomeIcon name="mail" />
            <span>admin@vexirahost.com</span>
          </div>
        </header>
        <InquiryForm kind="contact" />
      </div>
    </MarketingShell>
  );
}
