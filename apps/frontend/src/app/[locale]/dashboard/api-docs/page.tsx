"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";

export default function ApiDocumentationPage(): React.ReactElement {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.apiDocs");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[{ label: t("nav.dashboard"), href: "/dashboard" }, { label: tp("title") }]}
      />

      <section className="dashboard-section-card relative overflow-hidden p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <span className="material-symbols-outlined text-[25px]">api</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-[var(--label-primary)]">
                  {tp("whatsappTitle")}
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--label-secondary)]">
                {tp("whatsappDescription")}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {tp("available")}
          </span>
        </div>
        <Link href="/dashboard/whatsapp-api" className="dashboard-btn-primary mt-6">
          {tp("openWhatsappDocs")}
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--separator)] bg-[var(--fill-secondary)] p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <span className="material-symbols-outlined">rocket_launch</span>
          </span>
          <h2 className="text-lg font-bold tracking-tight text-[var(--label-primary)]">
            {tp("comingSoonTitle")}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--label-secondary)]">
          {tp("comingSoonDescription")}
        </p>
      </section>
    </div>
  );
}
