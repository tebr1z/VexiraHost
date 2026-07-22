"use client";

import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Link } from "@/i18n/navigation";

export function InstanceFooter(): React.ReactElement {
  const t = useTranslations("footer");

  return (
    <footer className="border-t-[0.5px] border-[var(--separator)] bg-[var(--bg)] py-14" id="legal">
      <div className="mx-auto max-w-container-max px-5 md:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo href="/" />
            <p className="mt-4 text-sm leading-relaxed text-[var(--label-secondary)]">
              {t("copyright", { year: new Date().getFullYear() })} {t("tagline")}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
              {t("product")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/hosting" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("blockStorage")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/servers" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("compute")}
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("pricing")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
              {t("resources")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/faq" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link href="/#infrastructure" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("documentation")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/tickets/new" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("apiStatus")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("apiReference")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
              {t("legal")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-[var(--label-secondary)] hover:text-[var(--accent)]">
                  {t("cookies")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
