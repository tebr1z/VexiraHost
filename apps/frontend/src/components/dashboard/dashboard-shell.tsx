"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DashboardNavbar } from "./dashboard-navbar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { EmailVerificationBanner } from "./email-verification-banner";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("dashboard-sidebar-collapsed") === "true");
  }, []);

  const toggleSidebar = (): void => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem("dashboard-sidebar-collapsed", String(next));
      return next;
    });
  };

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
    <div className="dashboard-workspace flex min-h-screen flex-col">
      <AnimatePresence>
        {!immersive && mobileOpen ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[65] bg-slate-950/45 backdrop-blur-sm lg:hidden"
              aria-label={t("closeMenu")}
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-[70] w-[min(88vw,17rem)] shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              <DashboardSidebar
                onNavigate={() => setMobileOpen(false)}
                className="h-full w-full pb-[env(safe-area-inset-bottom)]"
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-0 flex-1">
        {!immersive && (
          <div className="hidden shrink-0 transition-[width] duration-300 lg:block">
            <DashboardSidebar
              collapsed={sidebarCollapsed}
              onCollapseToggle={toggleSidebar}
              className="sticky top-0 h-screen"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {!immersive ? (
            <DashboardNavbar
              menuOpen={mobileOpen}
              onMenuClick={() => setMobileOpen((open) => !open)}
              hideSidebarToggle={immersive}
              sidebarCollapsed={sidebarCollapsed}
              onSidebarToggle={toggleSidebar}
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
              immersive ? "px-0 py-0" : "px-4 py-5 sm:px-6 sm:py-7 lg:px-8",
            )}
          >
            <div className={cn(immersive ? "w-full" : "max-w-container-max mx-auto")}>
              {!immersive && user && !user.emailVerified && <EmailVerificationBanner />}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
