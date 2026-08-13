"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";

export function DesignNav(): React.ReactElement {
  const t = useTranslations("design");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <header className="vd-nav">
      <Link href="/design" className="vd-nav-mark">
        Vexira<em>Design</em>
      </Link>
      <div className="vd-nav-meta">
        <Link href="/">{t("navHost")}</Link>
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-current={code === locale ? "true" : undefined}
            onClick={() => {
              if (code === locale) return;
              startTransition(() => {
                router.replace(pathname, { locale: code });
                router.refresh();
              });
            }}
          >
            {code}
          </button>
        ))}
        <a className="vd-nav-cta" href="#vd-cta">
          {t("navBegin")}
        </a>
      </div>
    </header>
  );
}
