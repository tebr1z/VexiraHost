import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InquiryForm } from "@/components/contact/inquiry-form";
import { HomeIcon } from "@/components/landing/home-icon";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seoPages");
  return buildPageMetadata({
    title: t("supportTitle"),
    description: t("supportDescription"),
    path: "/support",
  });
}

export default async function SupportPage(): Promise<React.ReactElement> {
  const t = await getTranslations("inquiry");

  return (
    <MarketingShell>
      <div className="public-inquiry-layout">
        <header className="public-page-heading">
          <p>VEXIRA HOST</p>
          <h1>{t("supportTitle")}</h1>
          <p>{t("supportSubtitle")}</p>
          <p className="text-on-surface-variant mt-2 text-sm">
            {t("supportTicketHint")}{" "}
            <Link
              href="/dashboard/tickets/new"
              className="text-secondary font-semibold hover:underline"
            >
              {t("supportTicketLink")}
            </Link>
          </p>
          <div className="public-inquiry-note">
            <HomeIcon name="support" />
            <span>Vexira Host</span>
          </div>
        </header>
        <InquiryForm kind="support" />
      </div>
    </MarketingShell>
  );
}
