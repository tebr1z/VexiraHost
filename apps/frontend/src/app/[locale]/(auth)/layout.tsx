import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Link } from "@/i18n/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const t = await getTranslations("auth");

  return (
    <div className="panel-mesh-bg min-h-screen">
      <header className="header-3d sticky top-0 z-50 border-b border-outline-variant/30 px-4 py-3 sm:px-6 lg:px-margin-desktop">
        <div className="mx-auto flex max-w-container-max items-center justify-between gap-4">
          <BrandLogo href="/" />
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
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
