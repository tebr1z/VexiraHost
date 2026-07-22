"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { cn } from "@/lib/cn";
import { usePrefetchRoutes } from "@/hooks/use-prefetch-routes";

import { ADMIN_PANEL_NAV } from "./admin-nav-config";
import { BrandLogo } from "@/components/brand/brand-logo";

function NavIcon({ name }: { name: string }): React.ReactElement {
  return (
    <span className="material-symbols-outlined text-[20px]" aria-hidden>
      {name}
    </span>
  );
}

function isActive(
  pathname: string,
  href: string,
  matchPrefix?: string,
  exactMatch?: boolean,
): boolean {
  if (exactMatch) return pathname === href;
  const prefix = matchPrefix ?? href;
  return pathname === href || pathname.startsWith(`${prefix}/`);
}

export function AdminSidebar({
  isAdmin = false,
  onLogout,
  onNavigate,
  className,
}: {
  isAdmin?: boolean;
  onLogout?: () => void;
  onNavigate?: () => void;
  className?: string;
}): React.ReactElement {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const items = ADMIN_PANEL_NAV.filter((item) => !item.adminOnly || isAdmin);
  const prefetchHrefs = useMemo(
    () => ADMIN_PANEL_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => item.href),
    [isAdmin],
  );
  usePrefetchRoutes(prefetchHrefs);

  return (
    <aside
      className={cn(
        "sidebar-lagom-dark flex h-full w-60 flex-col text-white",
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <BrandLogo href="/t4abriz/panel" onClick={onNavigate} tone="light" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.matchPrefix, item.exactMatch);
          const label = t(`nav.${item.labelKey}`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "nav-item-lagom-dark-active text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <NavIcon name={item.icon} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-white/10 p-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <NavIcon name="public" />
          <span>{t("nav.website")}</span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <NavIcon name="logout" />
          <span>{t("nav.signOut")}</span>
        </button>
      </div>
    </aside>
  );
}
