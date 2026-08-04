"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DashboardLegalBar } from "./dashboard-legal-bar";
import { DashboardNavbar } from "./dashboard-navbar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { EmailVerificationBanner } from "./email-verification-banner";

import { SiteFooter } from "@/components/layout/site-footer";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

const INSTANCE_DETAIL_PATTERN = /^\/dashboard\/servers\/[^/]+$/;

export function DashboardShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const t = useTranslations("dashboard.header");
  const tc = useTranslations("dashboard.common");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const immersive = INSTANCE_DETAIL_PATTERN.test(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (immersive) {
      setMobileOpen(false);
      return;
    }
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, immersive]);

  useEffect(() => {
    if (!mobileOpen || immersive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, immersive]);

  return (
    <div className="panel-mesh-bg flex min-h-screen flex-col">
      {!immersive && <DashboardLegalBar />}

      {!immersive && mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[65] bg-slate-900/35 backdrop-blur-sm lg:hidden"
          aria-label={t("closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {!immersive && mobileOpen ? (
        <div className="fixed inset-y-0 left-0 z-[70] w-[min(100vw,15rem)] shadow-2xl lg:hidden">
          <DashboardSidebar
            onNavigate={() => setMobileOpen(false)}
            className="h-full w-full pb-[env(safe-area-inset-bottom)]"
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {!immersive && (
          <div className="hidden shrink-0 lg:block">
            <DashboardSidebar collapsed={false} className="sticky top-0 h-screen" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {!immersive ? (
            <DashboardNavbar
              menuOpen={mobileOpen}
              onMenuClick={() => setMobileOpen((open) => !open)}
              hideSidebarToggle={immersive}
            />
          ) : (
            <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[var(--separator)] bg-[var(--bg-elevated)] px-4">
              <Link
                href="/dashboard/servers"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--fill-secondary)]"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {tc("backToServers")}
              </Link>
            </header>
          )}

          <main
            className={cn(
              "flex-1 transition-[padding] duration-300",
              immersive ? "px-0 py-0" : "px-4 py-6 sm:px-6 lg:px-8",
            )}
          >
            <div className={cn(immersive ? "w-full" : "max-w-container-max mx-auto")}>
              {!immersive && user && !user.emailVerified && <EmailVerificationBanner />}
              {children}
            </div>
          </main>

          {!immersive && <SiteFooter />}
        </div>
      </div>
    </div>
  );
}
