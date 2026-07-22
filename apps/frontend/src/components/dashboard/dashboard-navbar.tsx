"use client";

import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/brand-logo";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

const QUICK_LINKS = [
  { href: "/dashboard", labelKey: "dashboard", exact: true },
  { href: "/dashboard/hosting", labelKey: "hosting", exact: false },
  { href: "/dashboard/invoices", labelKey: "invoices", exact: false },
  { href: "/dashboard/tickets", labelKey: "support", exact: false },
] as const;

export function DashboardNavbar({
  onMenuClick,
  hideSidebarToggle,
}: {
  onMenuClick?: () => void;
  hideSidebarToggle?: boolean;
}): React.ReactElement {
  const t = useTranslations("dashboard.navbar");
  const th = useTranslations("dashboard.header");
  const tn = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.items.length);

  const displayName = user
    ? user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user.email
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--separator)] bg-[var(--bg-elevated)]/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {!hideSidebarToggle && (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-full p-2 text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] lg:hidden"
              aria-label={th("openMenu")}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          )}
          <BrandLogo href="/dashboard" className="hidden sm:flex" />
          <nav className="hidden items-center gap-1 md:flex" aria-label={t("ariaLabel")}>
            {QUICK_LINKS.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label-primary)]",
                  )}
                >
                  {tn(link.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {displayName && (
            <span className="hidden max-w-[140px] truncate text-sm text-[var(--label-secondary)] lg:block xl:max-w-[200px]">
              {displayName}
            </span>
          )}
          <Link
            href="/"
            className="hidden rounded-full px-2.5 py-1.5 text-sm text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--accent)] sm:inline-flex"
          >
            {tn("website")}
          </Link>
          <ThemeToggle className="!h-9 !w-9" />
          <CurrencySwitcher />
          <LanguageSwitcher />
          <Link
            href="/dashboard/cart"
            className="relative inline-flex items-center rounded-full bg-[var(--fill-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--fill)]"
          >
            {th("cart")}
            {cartCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-on-primary">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/account"
            className="hidden rounded-full bg-[var(--fill-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--fill)] sm:inline-flex"
          >
            {th("account")}
          </Link>
        </div>
      </div>
    </header>
  );
}
