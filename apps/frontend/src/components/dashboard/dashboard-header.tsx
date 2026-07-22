"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

export function DashboardHeader({
  onMenuClick,
  collapsed,
  onToggleCollapse,
  hideSidebarToggle,
}: {
  onMenuClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  hideSidebarToggle?: boolean;
}): React.ReactElement {
  const t = useTranslations("dashboard.header");
  const tc = useTranslations("dashboard.common");
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.items.length);

  return (
    <header className="header-panel sticky top-0 z-30 flex h-[52px] items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        {!hideSidebarToggle && (
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-full p-2 text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] lg:hidden"
            aria-label={t("openMenu")}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        {hideSidebarToggle && (
          <Link
            href="/dashboard/servers"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--fill-secondary)]"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {tc("backToServers")}
          </Link>
        )}
        {!hideSidebarToggle && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-full p-2 text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] lg:inline-flex"
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            <span className="material-symbols-outlined">
              {collapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        )}
        {user && (
          <p className="hidden text-sm text-on-surface-variant sm:block">
            {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user.email}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <LanguageSwitcher />
        <Link
          href="/dashboard/cart"
          className="relative inline-flex items-center rounded-full bg-[var(--fill-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--fill)]"
        >
          {t("cart")}
          {cartCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-on-primary">
              {cartCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/account"
          className={cn(
            "hidden rounded-full bg-[var(--fill-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--fill)] sm:inline-flex",
          )}
        >
          {t("account")}
        </Link>
      </div>
    </header>
  );
}
