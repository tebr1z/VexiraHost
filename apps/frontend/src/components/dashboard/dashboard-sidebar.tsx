"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DASHBOARD_FOOTER_LINKS, DASHBOARD_NAV_SECTIONS } from "./nav-config";

import { BrandLogo } from "@/components/brand/brand-logo";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
  if (href === "/dashboard") return pathname === "/dashboard";
  const prefix = matchPrefix ?? href;
  return pathname === href || pathname.startsWith(`${prefix}/`);
}

export function DashboardSidebar({
  collapsed = false,
  onNavigate,
  onCollapseToggle,
  className,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onCollapseToggle?: () => void;
  className?: string;
}): React.ReactElement {
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const prefetchHrefs = useMemo(
    () => [
      ...DASHBOARD_NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href)),
      ...DASHBOARD_FOOTER_LINKS.map((item) => item.href),
    ],
    [],
  );
  usePrefetchRoutes(prefetchHrefs);

  return (
    <aside
      className={cn(
        "sidebar-lagom flex h-full flex-col transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b-[0.5px] border-[var(--separator)] px-4",
          collapsed && "justify-center px-2",
          onNavigate && "justify-between gap-2",
        )}
      >
        <BrandLogo href="/dashboard" variant={collapsed ? "icon" : "full"} onClick={onNavigate} />
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label={t("header.closeMenu")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label-primary)]"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              close
            </span>
          </button>
        ) : null}
      </div>

      {onNavigate ? (
        <div className="mx-2 mt-2 flex items-center justify-between gap-1 rounded-2xl bg-[var(--fill-secondary)] px-1.5 py-1.5 [&_ul]:left-0 [&_ul]:right-auto">
          <LanguageSwitcher />
          <CurrencySwitcher />
          <ThemeToggle />
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {DASHBOARD_NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className={cn("mb-5 last:mb-0", collapsed && "mb-2")}>
            {!collapsed && (
              <p className="text-on-surface-variant/60 mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em]">
                {t(`sections.${section.labelKey}`)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href, item.matchPrefix, item.exactMatch);
                const label = t(`nav.${item.labelKey}`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "nav-item-lagom-active text-primary shadow-sm"
                        : "text-on-surface-variant hover:bg-[var(--fill-secondary)] hover:text-[var(--label-primary)]",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        active
                          ? "bg-[var(--accent)]/12 text-[var(--accent)]"
                          : "group-hover:bg-[var(--fill)]",
                      )}
                    >
                      <NavIcon name={item.icon} />
                    </span>
                    {!collapsed && <span className="truncate">{label}</span>}
                    {!collapsed && active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn("border-t border-slate-200 p-2 dark:border-white/10", collapsed && "px-1")}
      >
        {DASHBOARD_FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "text-on-surface-variant hover:text-primary flex items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-white/5",
              collapsed && "justify-center px-2",
            )}
          >
            {collapsed ? (
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            ) : (
              t(`nav.${link.labelKey}`)
            )}
          </Link>
        ))}
        {onCollapseToggle ? (
          <button
            type="button"
            onClick={onCollapseToggle}
            className={cn(
              "text-on-surface-variant hover:text-primary mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--fill-secondary)]",
              collapsed && "justify-center px-2",
            )}
            aria-label={t(collapsed ? "header.expandSidebar" : "header.collapseSidebar")}
            title={t(collapsed ? "header.expandSidebar" : "header.collapseSidebar")}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
            </span>
            {!collapsed ? <span>{t("header.collapseSidebar")}</span> : null}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
