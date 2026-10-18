"use client";

import { HomeIcon, type HomeIconName } from "./home-icon";

import type { CatalogCategory } from "@/features/catalog";
import { cn } from "@/lib/cn";

export const CATALOG_CATEGORY_ICONS: Record<string, string> = {
  HOSTING: "cloud",
  VPS: "terminal",
  DEDICATED: "storage",
  DOMAIN: "travel_explore",
  WHATSAPP_API: "forum",
  SSL: "lock",
  EMAIL: "alternate_email",
  LICENSE: "vpn_key",
  BACKUP: "cloud_sync",
};
const SVG_ICONS: Record<string, HomeIconName> = {
  HOSTING: "cloud",
  VPS: "server",
  DEDICATED: "database",
  DOMAIN: "globe",
  WHATSAPP_API: "chat",
  SSL: "shield",
  EMAIL: "mail",
  LICENSE: "key",
  BACKUP: "backup",
};

export function catalogCategoryIcon(
  category: Pick<CatalogCategory, "systemType" | "slug">,
): string {
  return (
    CATALOG_CATEGORY_ICONS[(category.systemType ?? category.slug).toUpperCase()] ?? "deployed_code"
  );
}

export function CatalogCategoryNav({
  categories,
  activeId,
  onChange,
  label,
  className,
}: {
  categories: CatalogCategory[];
  activeId: string | null;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("home-category-nav", className)} role="group" aria-label={label}>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={category.id === activeId}
          className="home-category"
          onClick={() => onChange(category.id)}
        >
          <HomeIcon
            name={SVG_ICONS[(category.systemType ?? category.slug).toUpperCase()] ?? "layers"}
          />
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}
