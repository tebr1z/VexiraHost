"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { MaterialIcon } from "./material-icon";
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
          aria-label={t("menu")}
          className="ios-nav-float public-navbar max-w-container-max pointer-events-auto mx-auto flex items-center gap-2 px-2.5 py-2 sm:px-3 lg:gap-4 lg:px-4"
        >
          <div className="flex min-w-0 shrink-0 items-center">
            <BrandLogo href="/" labelClassName="public-navbar-logo" />
          </div>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <div className="public-nav-cluster flex min-w-0 items-center gap-0.5">
              <NavLinks />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <div className="public-nav-tools flex items-center">
              <CartNavButton className="!h-9 !w-9 !rounded-full hover:!bg-[var(--bg-elevated)]" />
              <span className="mx-0.5 hidden h-5 w-px bg-[var(--separator)] lg:block" aria-hidden />
              <NavPreferencesMenu className="hidden lg:block" />
            </div>

            {showSignedIn ? (
              <Link href="/dashboard" className="public-nav-account hidden lg:inline-flex">
                <MaterialIcon name="space_dashboard" className="text-[18px]" />
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
                  <Link
                    href="/register"
                    className="ios-nav-cta public-nav-primary hidden lg:inline-flex"
                  >
                    {t("deployNow")}
                    <MaterialIcon name="arrow_forward" className="text-[17px]" />
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
