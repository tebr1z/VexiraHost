export interface DashboardNavItem {
  href: string;
  labelKey: keyof typeof DASHBOARD_NAV_KEYS;
  icon: string;
  matchPrefix?: string;
  exactMatch?: boolean;
}

export interface DashboardNavSection {
  labelKey: keyof typeof DASHBOARD_SECTION_KEYS;
  items: DashboardNavItem[];
}

export const DASHBOARD_NAV_KEYS = {
  dashboard: "dashboard",
  products: "products",
  domains: "domains",
  hosting: "hosting",
  servers: "servers",
  services: "services",
  orders: "orders",
  invoices: "invoices",
  payments: "payments",
  support: "support",
  cart: "cart",
  account: "account",
} as const;

export const DASHBOARD_SECTION_KEYS = {
  overview: "overview",
  services: "services",
  billing: "billing",
  support: "support",
  account: "account",
} as const;

export const DASHBOARD_NAV_SECTIONS: DashboardNavSection[] = [
  {
    labelKey: "overview",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: "dashboard" },
      { href: "/dashboard/products", labelKey: "products", icon: "inventory_2", matchPrefix: "/dashboard/products" },
    ],
  },
  {
    labelKey: "services",
    items: [
      { href: "/dashboard/domains", labelKey: "domains", icon: "language", matchPrefix: "/dashboard/domains" },
      { href: "/dashboard/hosting", labelKey: "hosting", icon: "dns", matchPrefix: "/dashboard/hosting" },
      { href: "/dashboard/servers", labelKey: "servers", icon: "memory", matchPrefix: "/dashboard/servers" },
      { href: "/dashboard/services", labelKey: "services", icon: "extension", matchPrefix: "/dashboard/services" },
    ],
  },
  {
    labelKey: "billing",
    items: [
      { href: "/dashboard/orders", labelKey: "orders", icon: "receipt_long", matchPrefix: "/dashboard/orders" },
      { href: "/dashboard/invoices", labelKey: "invoices", icon: "request_quote", matchPrefix: "/dashboard/invoices" },
      { href: "/dashboard/payments", labelKey: "payments", icon: "credit_card", matchPrefix: "/dashboard/payments" },
    ],
  },
  {
    labelKey: "support",
    items: [
      { href: "/dashboard/tickets", labelKey: "support", icon: "support_agent", matchPrefix: "/dashboard/tickets" },
    ],
  },
  {
    labelKey: "account",
    items: [
      { href: "/dashboard/cart", labelKey: "cart", icon: "shopping_cart", matchPrefix: "/dashboard/cart" },
      { href: "/dashboard/account", labelKey: "account", icon: "person", matchPrefix: "/dashboard/account" },
    ],
  },
];

/** @deprecated Use DASHBOARD_NAV_SECTIONS */
export const DASHBOARD_NAV: DashboardNavItem[] = DASHBOARD_NAV_SECTIONS.flatMap((s) => s.items);

export const DASHBOARD_FOOTER_LINKS = [
  { href: "/", labelKey: "website" as const },
] as const;
