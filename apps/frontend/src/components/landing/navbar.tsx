"use client";

import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/brand-logo";
import { CartNavButton } from "@/components/cart/cart-nav-button";
import { NavPreferencesMenu } from "@/components/layout/nav-preferences-menu";
import { Link } from "@/i18n/navigation";

import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

export function Navbar(): React.ReactElement {
  const t = useTranslations("nav");

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
      <nav className="ios-nav-float pointer-events-auto mx-auto flex max-w-container-max items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
          <BrandLogo href="/" />
          <div className="hidden min-w-0 flex-1 lg:flex lg:items-center lg:gap-1">
            <NavLinks />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <CartNavButton className="hidden sm:inline-flex !h-9 !w-9 !rounded-full hover:!bg-[var(--fill-secondary)]" />
          <NavPreferencesMenu className="hidden sm:block" />

          <Link href="/login" className="ios-nav-pill hidden text-[var(--label-secondary)] md:inline-flex">
            {t("clientPortal")}
          </Link>

          <Link href="/register" className="ios-nav-cta hidden sm:inline-flex">
            {t("deployNow")}
          </Link>

          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
