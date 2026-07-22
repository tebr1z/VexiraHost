"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/landing/material-icon";

const SIDEBAR_LINKS = [
  { href: "/dashboard", icon: "dashboard", labelKey: "dashboard" as const, navKey: "dashboard" as const },
  { href: "/dashboard/servers", icon: "memory", labelKey: "compute" as const, navKey: "compute" as const },
  { href: "/dashboard/domains", icon: "database", labelKey: "storage" as const, navKey: "storage" as const },
  { href: "/dashboard/servers", icon: "lan", labelKey: "network" as const, navKey: "network" as const },
  { href: "/dashboard/invoices", icon: "receipt_long", labelKey: "billing" as const, navKey: "billing" as const },
  { href: "/dashboard/tickets", icon: "contact_support", labelKey: "support" as const, navKey: "support" as const },
] as const;

type NavKey = (typeof SIDEBAR_LINKS)[number]["navKey"];

interface InstanceSidebarProps {
  activeNav?: NavKey;
}

export function InstanceSidebar({ activeNav = "compute" }: InstanceSidebarProps): React.ReactElement {
  const t = useTranslations("instances");
  const tn = useTranslations("instances.nav");
  const pathname = usePathname();

  const isActive = (navKey: NavKey, href: string) => {
    if (activeNav === navKey) return true;
    if (navKey === "compute") return pathname.startsWith("/dashboard/servers");
    if (navKey === "billing") return pathname.startsWith("/dashboard/invoices");
    if (navKey === "support") return pathname.startsWith("/dashboard/tickets");
    if (navKey === "storage") return pathname.startsWith("/dashboard/domains");
    if (navKey === "network") return pathname.startsWith("/dashboard/servers");
    return pathname === href;
  };

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-outline-variant/50 bg-surface-container-lowest py-stack-md lg:flex">
      <div className="mb-8 px-6">
        <h3 className="mb-2 font-geist text-label-sm uppercase tracking-widest text-outline">
          {t("cloudEngine")}
        </h3>
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <MaterialIcon name="memory" />
          </div>
          <div>
            <div className="font-inter text-body-md font-semibold text-on-surface">{t("vexiraCore")}</div>
            <div className="font-geist text-label-sm text-on-surface-variant">{t("enterprise")}</div>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {SIDEBAR_LINKS.map((link) => {
          const active = isActive(link.navKey, link.href);
          const className = active
            ? "mx-2 flex items-center gap-3 rounded-lg bg-primary-container px-4 py-3 font-semibold text-on-primary-container"
            : "mx-2 flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-primary";

          return (
            <Link key={link.navKey} href={link.href} className={className}>
              <MaterialIcon name={link.icon} />
              <span className="font-inter text-body-md">{tn(link.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4 border-t border-outline-variant/30 px-4 py-6">
        <Link
          href="/#pricing"
          className="flex items-center gap-3 text-outline transition-colors hover:text-primary"
        >
          <MaterialIcon name="menu_book" />
          <span className="font-geist text-label-sm">{t("documentation")}</span>
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 text-outline transition-colors hover:text-primary"
        >
          <MaterialIcon name="signal_cellular_alt" />
          <span className="font-geist text-label-sm">{t("apiStatus")}</span>
        </Link>
      </div>
    </aside>
  );
}
