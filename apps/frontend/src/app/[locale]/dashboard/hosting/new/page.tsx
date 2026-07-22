"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";

export default function NewHostingPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.hosting");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={tp("createTitle")}
        description={tp("createDescription")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.hosting"), href: "/dashboard/hosting" },
          { label: tp("createBreadcrumb") },
        ]}
      />

      <div className="rounded-2xl border border-outline-variant/50 bg-surface p-6">
        <p className="text-on-surface-variant">{tp("paywallHint")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/hosting"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("browsePlans")}
          </Link>
          <Link
            href="/cart"
            className="inline-flex h-10 items-center rounded-xl border border-outline-variant px-5 text-sm font-semibold"
          >
            {tp("goToCart")}
          </Link>
        </div>
      </div>
    </div>
  );
}
