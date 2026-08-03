import type { CatalogCategory } from "@/features/catalog";
import type {
  PublicNavGroup,
  PublicNavItem,
} from "@/features/navigation/services/navigation.service";

type NavLabelKey = "licenses" | "hostingServers" | "solutions" | "pricing";

const HOSTING_TYPES = new Set(["HOSTING", "VPS", "DEDICATED"]);
const LICENSE_TYPES = new Set(["LICENSE"]);

function categoryNavItem(cat: CatalogCategory): PublicNavItem {
  return {
    id: `catalog-${cat.id}`,
    label: cat.name,
    href: `/products/${cat.slug}`,
    pathMatch: `/products/${cat.slug}`,
  };
}

/** Build navbar groups from admin catalog categories (grouped by systemType). */
export function buildCatalogNavGroups(
  categories: CatalogCategory[],
  labels: Record<NavLabelKey, string>,
): PublicNavGroup[] {
  const licenseItems: PublicNavItem[] = [];
  const hostingItems: PublicNavItem[] = [];
  const otherItems: PublicNavItem[] = [];

  for (const cat of categories) {
    const item = categoryNavItem(cat);
    if (cat.systemType && LICENSE_TYPES.has(cat.systemType)) {
      licenseItems.push(item);
    } else if (cat.systemType && HOSTING_TYPES.has(cat.systemType)) {
      hostingItems.push(item);
    } else {
      otherItems.push(item);
    }
  }

  const groups: PublicNavGroup[] = [];

  if (licenseItems.length > 0) {
    groups.push({ key: "licenses", label: labels.licenses, items: licenseItems });
  }
  if (hostingItems.length > 0) {
    groups.push({ key: "hostingServers", label: labels.hostingServers, items: hostingItems });
  }
  if (otherItems.length > 0) {
    groups.push({ key: "catalog", label: labels.solutions, items: otherItems });
  }

  return groups;
}
