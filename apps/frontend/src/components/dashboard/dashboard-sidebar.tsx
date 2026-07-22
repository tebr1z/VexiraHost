"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { cn } from "@/lib/cn";
import { usePrefetchRoutes } from "@/hooks/use-prefetch-routes";

import { DASHBOARD_FOOTER_LINKS, DASHBOARD_NAV_SECTIONS } from "./nav-config";
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
  if (href === "/dashboard") return pathname === "/dashboard";
  const prefix = matchPrefix ?? href;
  return pathname === href || pathname.startsWith(`${prefix}/`);
}

export function DashboardSidebar({
  collapsed = false,
  onNavigate,
  className,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
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
        "sidebar-lagom flex h-full flex-col",
        collapsed ? "w-[72px]" : "w-60",
        className,
      )}
    >
      <div className={cn("flex h-[52px] items-center border-b-[0.5px] border-[var(--separator)] px-4", collapsed && "justify-center px-2")}>
        <BrandLogo
          href="/dashboard"
          variant={collapsed ? "icon" : "full"}
          onClick={onNavigate}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {DASHBOARD_NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className={cn("mb-4 last:mb-0", collapsed && "mb-2")}>
            {!collapsed && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
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
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "nav-item-lagom-active text-primary"
                        : "text-on-surface-variant hover:bg-slate-100 hover:text-primary dark:hover:bg-white/5",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <NavIcon name={item.icon} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-slate-200 p-2 dark:border-white/10", collapsed && "px-1")}>
        {DASHBOARD_FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-on-surface-variant transition hover:bg-slate-100 hover:text-primary dark:hover:bg-white/5",
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
      </div>
    </aside>
  );
}
