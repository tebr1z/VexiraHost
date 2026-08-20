"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { MobileMenuDrawer, MobileMenuTrigger } from "./mobile-menu";
import { NavLinks } from "./nav-links";

import { BrandLogo } from "@/components/brand/brand-logo";
import { CartNavButton } from "@/components/cart/cart-nav-button";
import { NavPreferencesMenu } from "@/components/layout/nav-preferences-menu";
import { useAuthHydration } from "@/features/auth/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useMaintenanceStore } from "@/stores/maintenance-store";

export function Navbar(): React.ReactElement {
  const t = useTranslations("nav");
  const { isReady, isAuthenticated } = useAuthHydration();
  const showSignedIn = isReady && isAuthenticated;
  const registerEnabled = useMaintenanceStore((s) => s.access.registerEnabled);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <nav
          data-scrolled={scrolled ? "true" : "false"}
          className="ios-nav-float max-w-container-max pointer-events-auto mx-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
            <BrandLogo href="/" />
            <div className="hidden min-w-0 flex-1 lg:flex lg:items-center lg:gap-1">
              <NavLinks />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <CartNavButton className="!h-9 !w-9 !rounded-full hover:!bg-[var(--fill-secondary)]" />
            <NavPreferencesMenu className="hidden lg:block" />

            {showSignedIn ? (
              <Link
                href="/dashboard"
                className="ios-nav-pill hidden text-[var(--label-secondary)] lg:inline-flex"
              >
                {t("clientPortal")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="ios-nav-pill hidden text-[var(--label-secondary)] lg:inline-flex"
                >
                  {t("signIn")}
                </Link>
                {registerEnabled ? (
                  <Link href="/register" className="ios-nav-cta hidden lg:inline-flex">
                    {t("deployNow")}
                  </Link>
                ) : null}
              </>
            )}

            <MobileMenuTrigger open={mobileOpen} onOpenChange={setMobileOpen} />
          </div>
        </nav>
      </header>

      {/* Outside .ios-nav-float so backdrop-filter cannot clip the drawer */}
      <MobileMenuDrawer open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
