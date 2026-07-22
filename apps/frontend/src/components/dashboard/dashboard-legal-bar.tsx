"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function DashboardLegalBar(): React.ReactElement {
  const t = useTranslations("dashboard.legalBar");

  return (
    <div className="border-b border-[var(--separator)] bg-[var(--accent)]/5 px-4 py-1.5 text-center text-xs text-[var(--label-secondary)] sm:px-6">
      <div className="mx-auto flex max-w-container-max items-center justify-end gap-3 sm:gap-4">
        <Link href="/privacy" className="transition hover:text-[var(--accent)]">
          {t("privacy")}
        </Link>
        <span className="text-[var(--label-tertiary)]" aria-hidden>
          ·
        </span>
        <Link href="/terms" className="transition hover:text-[var(--accent)]">
          {t("terms")}
        </Link>
      </div>
    </div>
  );
}
