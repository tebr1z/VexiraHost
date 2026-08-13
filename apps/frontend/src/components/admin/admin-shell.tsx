"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isStaffRole } from "@/lib/is-staff-role";
import { useAuthStore, onAuthStoreHydrated } from "@/stores/auth-store";
import { isViewingAsImpersonatedUser, useImpersonationStore } from "@/stores/impersonation-store";

/**
 * Staff-only shell. Anonymous and customer sessions receive a generic 404 —
 * no login bounce and no 403 copy that would confirm an admin area exists.
 */
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
    }
  }, [hydrated, sessionReady, isImpersonatingAway, router]);

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

  if (isImpersonatingAway) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220] text-white/70">
        {t("login.checking")}
      </div>
    );
  }

  if (!isAuthenticated || !user || !accessToken || !isStaff) {
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
        <aside className="fixed inset-y-0 left-0 z-[70] w-[min(18rem,88vw)] lg:hidden">
          <AdminSidebar isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
        </aside>
      ) : null}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <AdminSidebar isAdmin={isAdmin} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1220]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden"
                aria-label={t("header.openMenu")}
                onClick={() => setMobileOpen(true)}
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{t("header.title")}</p>
                <p className="text-on-surface-variant truncate text-xs">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-white/90">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                </p>
                <p className="text-on-surface-variant text-xs capitalize">{user.role}</p>
              </div>
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden sm:inline">{t("header.logout")}</span>
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
