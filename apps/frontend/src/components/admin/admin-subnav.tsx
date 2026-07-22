"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

import { ADMIN_SUBNAV_LINKS } from "./admin-nav-config";

export function AdminSubnav(): React.ReactElement | null {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";

  const links = ADMIN_SUBNAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="card-3d mb-6 flex flex-wrap gap-2 rounded-2xl p-3">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "nav-item-3d-active bg-primary text-on-primary"
                : "bg-white/50 text-on-surface-variant hover:-translate-y-0.5 hover:bg-white/80 hover:text-primary hover:shadow-md",
            )}
          >
            {t(`nav.${link.labelKey}`)}
          </Link>
        );
      })}
    </nav>
  );
}
