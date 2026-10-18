"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { ADMIN_PANEL_NAV, ADMIN_PANEL_NAV_GROUPS } from "./admin-nav-config";

import { BrandLogo } from "@/components/brand/brand-logo";
import { usePrefetchRoutes } from "@/hooks/use-prefetch-routes";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

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
  const groups = useMemo(
    () =>
      ADMIN_PANEL_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.adminOnly || isAdmin),
      })).filter((group) => group.items.length > 0),
    [isAdmin],
  );
  const prefetchHrefs = useMemo(
    () => ADMIN_PANEL_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => item.href),
    [isAdmin],
  );
  usePrefetchRoutes(prefetchHrefs);

  return (
    <aside
      className={cn(
        "sidebar-lagom flex h-full flex-col text-[var(--label)]",
        onNavigate ? "w-full" : "w-64",
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--separator)] px-4">
        <BrandLogo href="/t4abriz/panel" onClick={onNavigate} />
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label={t("header.closeMenu")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--label-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--label)]"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              close
            </span>
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-3">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label-tertiary)]">
              {t(`nav.${group.labelKey}`)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, item.matchPrefix, item.exactMatch);
                const label = t(`nav.${item.labelKey}`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm transition-colors",
                      active
                        ? "nav-item-lagom-active"
                        : "text-[var(--label-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--label)]",
                    )}
                  >
                    <NavIcon name={item.icon} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--separator)] p-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--label-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--label)]"
        >
          <NavIcon name="public" />
          <span>{t("nav.website")}</span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--label-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--label)]"
        >
          <NavIcon name="logout" />
          <span>{t("nav.signOut")}</span>
        </button>
      </div>
    </aside>
  );
}
