import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InquiryForm } from "@/components/contact/inquiry-form";
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
      <div className="mx-auto max-w-lg px-5 py-16">
        <h1 className="font-jakarta text-primary text-3xl font-bold">{t("supportTitle")}</h1>
        <p className="text-on-surface-variant mt-3 text-sm">{t("supportSubtitle")}</p>
        <p className="text-on-surface-variant mt-2 text-sm">
          {t("supportTicketHint")}{" "}
          <Link
            href="/dashboard/tickets/new"
            className="text-secondary font-semibold hover:underline"
          >
            {t("supportTicketLink")}
          </Link>
        </p>
        <div className="mt-8">
          <InquiryForm kind="support" />
        </div>
      </div>
    </MarketingShell>
  );
}
