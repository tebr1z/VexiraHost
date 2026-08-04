export interface AdminNavItem {
  href: string;
  labelKey: string;
  icon: string;
  matchPrefix?: string;
  adminOnly?: boolean;
  exactMatch?: boolean;
}

export interface AdminNavGroup {
  id: string;
  labelKey: string;
  items: AdminNavItem[];
}

export const ADMIN_PANEL_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "main",
    labelKey: "groupMain",
    items: [
      {
        href: "/t4abriz/panel",
        labelKey: "overview",
        icon: "dashboard",
        matchPrefix: "/t4abriz/panel",
        exactMatch: true,
      },
    ],
  },
  {
    id: "customers",
    labelKey: "groupCustomers",
    items: [
      {
        href: "/t4abriz/panel/users",
        labelKey: "users",
        icon: "group",
        matchPrefix: "/t4abriz/panel/users",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/tickets",
        labelKey: "tickets",
        icon: "support_agent",
        matchPrefix: "/t4abriz/panel/tickets",
      },
    ],
  },
  {
    id: "billing",
    labelKey: "groupBilling",
    items: [
      {
        href: "/t4abriz/panel/orders",
        labelKey: "orders",
        icon: "receipt_long",
        matchPrefix: "/t4abriz/panel/orders",
      },
      {
        href: "/t4abriz/panel/invoices",
        labelKey: "invoices",
        icon: "request_quote",
        matchPrefix: "/t4abriz/panel/invoices",
      },
      {
        href: "/t4abriz/panel/payments",
        labelKey: "payments",
        icon: "payments",
        matchPrefix: "/t4abriz/panel/payments",
      },
      {
        href: "/t4abriz/panel/promo-codes",
        labelKey: "promoCodes",
        icon: "sell",
        matchPrefix: "/t4abriz/panel/promo-codes",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/campaigns",
        labelKey: "campaigns",
        icon: "campaign",
        matchPrefix: "/t4abriz/panel/campaigns",
        adminOnly: true,
      },
    ],
  },
  {
    id: "catalog",
    labelKey: "groupCatalog",
    items: [
      {
        href: "/t4abriz/panel/products",
        labelKey: "products",
        icon: "inventory_2",
        matchPrefix: "/t4abriz/panel/products",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/categories",
        labelKey: "categories",
        icon: "category",
        matchPrefix: "/t4abriz/panel/categories",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/hosting/plans",
        labelKey: "hostingPlans",
        icon: "layers",
        matchPrefix: "/t4abriz/panel/hosting/plans",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/servers/plans",
        labelKey: "serverPlans",
        icon: "memory",
        matchPrefix: "/t4abriz/panel/servers/plans",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/domains/changes",
        labelKey: "domainChangeLog",
        icon: "history",
        matchPrefix: "/t4abriz/panel/domains/changes",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/domains/tlds",
        labelKey: "tldPricing",
        icon: "language",
        matchPrefix: "/t4abriz/panel/domains/tlds",
        adminOnly: true,
      },
    ],
  },
  {
    id: "infrastructure",
    labelKey: "groupInfrastructure",
    items: [
      {
        href: "/t4abriz/panel/hosting/servers",
        labelKey: "hostingServers",
        icon: "dns",
        matchPrefix: "/t4abriz/panel/hosting/servers",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/hosting/accounts",
        labelKey: "hostingAccounts",
        icon: "cloud",
        matchPrefix: "/t4abriz/panel/hosting/accounts",
      },
    ],
  },
  {
    id: "website",
    labelKey: "groupWebsiteContent",
    items: [
      {
        href: "/t4abriz/panel/navigation",
        labelKey: "navigation",
        icon: "menu",
        matchPrefix: "/t4abriz/panel/navigation",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/cms/hosting",
        labelKey: "cmsPages",
        icon: "web",
        matchPrefix: "/t4abriz/panel/cms",
        adminOnly: true,
      },
    ],
  },
  {
    id: "system",
    labelKey: "groupSystemGroup",
    items: [
      {
        href: "/t4abriz/panel/system",
        labelKey: "system",
        icon: "settings",
        matchPrefix: "/t4abriz/panel/system",
        adminOnly: true,
      },
      {
        href: "/t4abriz/panel/whatsapp",
        labelKey: "whatsapp",
        icon: "chat",
        matchPrefix: "/t4abriz/panel/whatsapp",
        adminOnly: true,
      },
    ],
  },
];

/** Flat list kept for prefetch / subnav consumers */
export const ADMIN_PANEL_NAV: AdminNavItem[] = ADMIN_PANEL_NAV_GROUPS.flatMap(
  (group) => group.items,
);

export const ADMIN_LOGIN_PATH = "/t4abriz";
export const ADMIN_PANEL_PATH = "/t4abriz/panel";

export const ADMIN_SUBNAV_LINKS = ADMIN_PANEL_NAV.map((item) => ({
  href: item.href,
  labelKey: item.labelKey,
  exact: Boolean(item.exactMatch),
  adminOnly: Boolean(item.adminOnly),
}));
