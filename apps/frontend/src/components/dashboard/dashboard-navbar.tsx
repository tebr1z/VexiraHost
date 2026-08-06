"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOutToHome } from "@/features/auth/lib/sign-out";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

export function DashboardNavbar({
  onMenuClick,
  menuOpen = false,
  hideSidebarToggle,
  sidebarCollapsed = false,
  onSidebarToggle,
}: {
  onMenuClick?: () => void;
  menuOpen?: boolean;
  hideSidebarToggle?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}): React.ReactElement {
  const th = useTranslations("dashboard.header");
  const tn = useTranslations("dashboard.nav");
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.items.length);
  const [menuOpenUser, setMenuOpenUser] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = user
    ? user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user.email
    : null;
  const initial = displayName?.trim().charAt(0).toUpperCase() ?? "V";

  useEffect(() => {
    if (!menuOpenUser) return;
    const onPointerDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setMenuOpenUser(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenUser(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpenUser]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setMenuOpenUser(false);
    await signOutToHome();
  };

  return (
    <header className="header-panel sticky top-0 z-30">
      <div className="flex h-16 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {!hideSidebarToggle && (
            <button
              type="button"
              onClick={onMenuClick}
              className="shrink-0 rounded-xl p-2 text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? th("closeMenu") : th("openMenu")}
            >
              <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
            </button>
          )}
          <BrandLogo href="/dashboard" className="min-w-0 lg:hidden" />
          {!hideSidebarToggle && onSidebarToggle ? (
            <button
              type="button"
              onClick={onSidebarToggle}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--accent)] lg:inline-flex"
              aria-label={th(sidebarCollapsed ? "expandSidebar" : "collapseSidebar")}
              title={th(sidebarCollapsed ? "expandSidebar" : "collapseSidebar")}
            >
              <span className="material-symbols-outlined text-[20px]">dock_to_right</span>
            </button>
          ) : null}
          <div className="hidden h-6 w-px bg-[var(--separator)] lg:block" />
          <p className="hidden text-sm font-semibold text-[var(--label-primary)] lg:block">
            {tn("dashboard")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="hidden h-9 w-9 items-center justify-center rounded-xl text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--accent)] sm:inline-flex"
            title={tn("website")}
            aria-label={tn("website")}
          >
            <span className="material-symbols-outlined text-[20px]">language</span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle className="!h-9 !w-9" />
            <CurrencySwitcher />
            <LanguageSwitcher />
          </div>
          <NotificationBell />
          <Link
            href="/dashboard/cart"
            className="relative inline-flex h-9 items-center justify-center rounded-xl bg-[var(--fill-secondary)] px-2.5 text-sm font-medium text-[var(--accent)] transition hover:-translate-y-0.5 hover:bg-[var(--fill)] sm:px-3"
            aria-label={th("cart")}
          >
            <span className="material-symbols-outlined text-[20px] sm:hidden" aria-hidden>
              shopping_cart
            </span>
            <span className="hidden sm:inline">{th("cart")}</span>
            {cartCount > 0 && (
              <span className="bg-primary text-on-primary absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] sm:static sm:ml-1.5 sm:h-auto sm:min-w-0 sm:px-1.5 sm:py-0.5 sm:text-xs">
                {cartCount}
              </span>
            )}
          </Link>

          <div ref={userMenuRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setMenuOpenUser((v) => !v)}
              aria-expanded={menuOpenUser}
              aria-haspopup="menu"
              aria-label={th("accountMenu")}
              className="hover:border-[var(--accent)]/30 group inline-flex items-center gap-2 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-[var(--label-primary)] shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-violet-500 text-xs font-bold text-white shadow-sm">
                {initial}
              </span>
              <span className="hidden max-w-[120px] truncate xl:block">
                {displayName ?? th("account")}
              </span>
              <span
                className={cn(
                  "material-symbols-outlined text-[18px] text-[var(--label-tertiary)] transition",
                  menuOpenUser && "rotate-180",
                )}
              >
                expand_more
              </span>
            </button>

            <AnimatePresence>
              {menuOpenUser ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15 }}
                  role="menu"
                  aria-label={th("accountMenu")}
                  className="shadow-apple-md absolute right-0 top-full z-[70] mt-2 min-w-[12.5rem] overflow-hidden rounded-[14px] border border-[var(--separator)] bg-[var(--bg-elevated)] p-1"
                >
                  <div className="border-b border-[var(--separator)] px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-[var(--label)]">
                      {displayName ?? th("account")}
                    </p>
                    {user?.email ? (
                      <p className="mt-0.5 truncate text-xs text-[var(--label-tertiary)]">
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href="/dashboard/account"
                    role="menuitem"
                    onClick={() => setMenuOpenUser(false)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition",
                      "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]",
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    <span>{th("accountSettings")}</span>
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={signingOut}
                    onClick={() => void handleSignOut()}
                    className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>{signingOut ? th("signingOut") : th("signOut")}</span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Mobile: keep direct account link */}
          <Link
            href="/dashboard/account"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] text-sm font-medium text-[var(--label-primary)] shadow-sm sm:hidden"
            aria-label={th("account")}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-violet-500 text-xs font-bold text-white">
              {initial}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
