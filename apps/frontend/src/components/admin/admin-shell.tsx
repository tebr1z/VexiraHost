"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ADMIN_LOGIN_PATH } from "@/components/admin/admin-nav-config";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/cn";
import { useAuthStore, onAuthStoreHydrated } from "@/stores/auth-store";
import {
  isViewingAsImpersonatedUser,
  useImpersonationStore,
} from "@/stores/impersonation-store";

export function AdminShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("admin");
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const clearSession = useAuthStore((s) => s.clearSession);
  const hydrateToken = useAuthStore((s) => s.hydrateToken);
  const adminSession = useImpersonationStore((s) => s.adminSession);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const isStaff = user?.role === "admin" || user?.role === "staff";
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
    if (!hydrated) {
      return;
    }
    if (isImpersonatingAway) {
      router.replace("/dashboard");
      return;
    }
    if (!isStaff) {
      router.replace(ADMIN_LOGIN_PATH);
    }
  }, [hydrated, isStaff, isImpersonatingAway, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [children]);

  const handleLogout = () => {
    clearSession();
    router.push(ADMIN_LOGIN_PATH);
  };

  if (!hydrated || !sessionReady || !user || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-white/70">
        {t("login.checking")}
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-white/70">
        {t("login.checking")}
      </div>
    );
  }

  return (
    <div className="admin-mesh-bg min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          aria-label={t("header.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AdminSidebar isAdmin={isAdmin} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-h-screen">
        <div className="hidden shrink-0 lg:block">
          <AdminSidebar isAdmin={isAdmin} onLogout={handleLogout} className="sticky top-0 h-screen" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="header-panel flex h-14 items-center justify-between px-4 lg:px-6">
            <button
              type="button"
              className="rounded-md p-2 text-on-surface-variant transition hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("header.openMenu")}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="ml-auto flex items-center gap-3 text-right">
              <ThemeToggle />
              <LanguageSwitcher />
              <div>
                <p className="text-sm font-medium text-primary">{user.email}</p>
                <p className="text-xs capitalize text-on-surface-variant">{user.role}</p>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-container-max">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
