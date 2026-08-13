import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const t = await getTranslations("auth");

  return (
    <div className="panel-mesh-bg min-h-screen">
      <header className="header-3d border-outline-variant/30 lg:px-margin-desktop sticky top-0 z-50 border-b px-4 py-3 sm:px-6">
        <div className="max-w-container-max mx-auto flex items-center justify-between gap-4">
          <BrandLogo href="/" />
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              href="/"
              className="text-on-surface-variant hover:text-primary text-sm transition-colors"
            >
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
