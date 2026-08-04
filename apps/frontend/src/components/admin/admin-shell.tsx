"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ADMIN_PANEL_PATH } from "@/components/admin/admin-nav-config";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { stashAuthNext } from "@/features/auth/lib/auth-redirect";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isStaffRole } from "@/lib/is-staff-role";
import { useAuthStore, onAuthStoreHydrated } from "@/stores/auth-store";
import { isViewingAsImpersonatedUser, useImpersonationStore } from "@/stores/impersonation-store";

export function AdminShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin");
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const hydrateToken = useAuthStore((s) => s.hydrateToken);
  const adminSession = useImpersonationStore((s) => s.adminSession);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const isStaff = isStaffRole(user?.role);
  const isAdmin = user?.role === "admin";
  const isImpersonatingAway = isViewingAsImpersonatedUser(adminSession, user?.id);

  useEffect(() => {
    hydrateToken();

    const finish = () => {
      hydrateToken();
      setHydrated(true);
    };

    return onAuthStoreHydrated(finish);
  }, [hydrateToken]);

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken, accessToken]);

  useEffect(() => {
    if (!hydrated || !sessionReady) return;

    if (isImpersonatingAway) {
      router.replace("/dashboard");
      return;
    }

    if (!isAuthenticated || !user || !accessToken) {
      stashAuthNext(ADMIN_PANEL_PATH);
      router.replace(`/login?next=${encodeURIComponent(ADMIN_PANEL_PATH)}`);
    }
  }, [hydrated, sessionReady, isAuthenticated, user, accessToken, isImpersonatingAway, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!hydrated || !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-white/70">
        {t("login.checking")}
      </div>
    );
  }

  if (!isAuthenticated || !user || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-white/70">
        {t("login.checking")}
      </div>
    );
  }

  if (!isStaff) {
    notFound();
  }

  return (
    <div className="admin-mesh-bg min-h-screen">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[65] bg-slate-900/45 backdrop-blur-sm lg:hidden"
          aria-label={t("header.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-y-0 left-0 z-[70] w-[min(100vw,15rem)] shadow-2xl lg:hidden">
          <AdminSidebar
            isAdmin={isAdmin}
            onLogout={handleLogout}
            onNavigate={() => setMobileOpen(false)}
            className="h-full w-full pb-[env(safe-area-inset-bottom)]"
          />
        </div>
      ) : null}

      <div className="flex min-h-screen">
        <div className="hidden shrink-0 lg:block">
          <AdminSidebar
            isAdmin={isAdmin}
            onLogout={handleLogout}
            className="sticky top-0 h-screen"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="header-panel sticky top-0 z-30 flex h-14 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
            <button
              type="button"
              className="text-on-surface-variant shrink-0 rounded-md p-2 transition hover:bg-slate-100 lg:hidden dark:hover:bg-white/5"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t("header.closeMenu") : t("header.openMenu")}
            >
              <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
            </button>
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
              <div className="min-w-0 text-right">
                <p className="text-primary max-w-[38vw] truncate text-sm font-medium sm:max-w-[12rem]">
                  {user.email}
                </p>
                <p className="text-on-surface-variant text-xs capitalize">{user.role}</p>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="max-w-container-max mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
