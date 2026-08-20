import { emptyLocalizedText, parseLocalizedText, type LocalizedText } from "@/lib/localized-text";

export const SITE_SECTIONS = [
  "hosting",
  "vps",
  "domains",
  "licenses",
  "licensesWindows",
  "licensesServer",
  "licensesOffice",
  "licensesAntivirus",
  "email",
  "webmail",
  "whatsapp",
  "cart",
  "blog",
  "forum",
  "design",
  "about",
  "faq",
  "contact",
  "support",
] as const;

export type SiteSection = (typeof SITE_SECTIONS)[number];

export const SITE_SECTION_GROUPS: Array<{
  key: "products" | "pages" | "help";
  items: SiteSection[];
}> = [
  {
    key: "products",
    items: [
      "hosting",
      "vps",
      "domains",
      "licenses",
      "licensesWindows",
      "licensesServer",
      "licensesOffice",
      "licensesAntivirus",
      "email",
      "webmail",
      "whatsapp",
      "cart",
    ],
  },
  { key: "pages", items: ["blog", "forum", "design", "about", "faq"] },
  { key: "help", items: ["contact", "support"] },
];

export interface SectionAccess {
  blocked: boolean;
  message: LocalizedText;
}

export interface SiteAccessConfig {
  loginEnabled: boolean;
  registerEnabled: boolean;
  loginMessage: LocalizedText;
  registerMessage: LocalizedText;
  sections: Record<SiteSection, SectionAccess>;
}

function defaultSections(): Record<SiteSection, SectionAccess> {
  return Object.fromEntries(
    SITE_SECTIONS.map((key) => [key, { blocked: false, message: emptyLocalizedText() }]),
  ) as Record<SiteSection, SectionAccess>;
}

export function defaultSiteAccess(): SiteAccessConfig {
  return {
    loginEnabled: true,
    registerEnabled: true,
    loginMessage: emptyLocalizedText(),
    registerMessage: emptyLocalizedText(),
    sections: defaultSections(),
  };
}

export function parseSiteAccess(raw: unknown): SiteAccessConfig {
  const fallback = defaultSiteAccess();
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  const sections = defaultSections();
  if (record.sections && typeof record.sections === "object") {
    const incoming = record.sections as Record<string, unknown>;
    for (const key of SITE_SECTIONS) {
      const row = incoming[key];
      if (!row || typeof row !== "object") continue;
      const item = row as { blocked?: unknown; message?: unknown };
      sections[key] = {
        blocked: item.blocked === true,
        message: parseLocalizedText(item.message),
      };
    }
  }
  return {
    loginEnabled: record.loginEnabled !== false,
    registerEnabled: record.registerEnabled !== false,
    loginMessage: parseLocalizedText(record.loginMessage),
    registerMessage: parseLocalizedText(record.registerMessage),
    sections,
  };
}

export function matchAccessSection(pathname: string): SiteSection | null {
  const path = pathname.split("?")[0] || "/";

  if (path === "/hosting" || path.startsWith("/hosting/") || path === "/dashboard/hosting/new") {
    return "hosting";
  }
  if (
    path === "/vps" ||
    path.startsWith("/vps/") ||
    path === "/instances" ||
    path.startsWith("/instances/") ||
    path === "/dashboard/servers/new"
  ) {
    return "vps";
  }
  if (path === "/domains" || path.startsWith("/domains/")) {
    return "domains";
  }
  if (path.startsWith("/licenses/windows")) return "licensesWindows";
  if (path.startsWith("/licenses/server")) return "licensesServer";
  if (path.startsWith("/licenses/office")) return "licensesOffice";
  if (path.startsWith("/licenses/antivirus")) return "licensesAntivirus";
  if (path === "/licenses" || path.startsWith("/licenses/")) return "licenses";
  if (path === "/email" || path.startsWith("/email/")) return "email";
  if (path === "/webmail" || path.startsWith("/webmail/")) return "webmail";
  if (path.startsWith("/products/whatsapp")) return "whatsapp";
  if (path === "/blog" || path.startsWith("/blog/")) return "blog";
  if (path === "/forum" || path.startsWith("/forum/")) return "forum";
  if (path === "/design" || path.startsWith("/design/")) return "design";
  if (path === "/about" || path.startsWith("/about/")) return "about";
  if (path === "/faq" || path.startsWith("/faq/")) return "faq";
  if (path === "/cart" || path === "/dashboard/cart") return "cart";
  if (path === "/contact") return "contact";
  if (path === "/support" || path === "/dashboard/tickets/new") return "support";

  if (path.startsWith("/products/")) {
    const slug = path.split("/")[2] ?? "";
    if (slug.includes("hosting")) return "hosting";
    if (slug.includes("vps") || slug.includes("vds") || slug.includes("server")) return "vps";
    if (slug.includes("domain")) return "domains";
    if (slug.includes("windows")) return "licensesWindows";
    if (slug.includes("office")) return "licensesOffice";
    if (slug.includes("antivirus")) return "licensesAntivirus";
    if (slug.includes("license")) return "licenses";
    if (slug.includes("whatsapp")) return "whatsapp";
    if (slug.includes("webmail")) return "webmail";
    if (slug.includes("mail") || slug.includes("workspace") || slug.includes("email"))
      return "email";
  }

  return null;
}

export function isHrefBlocked(href: string, access: SiteAccessConfig): boolean {
  const path = href.split("?")[0] || "/";
  if (path === "/register" || path.startsWith("/register/")) {
    return !access.registerEnabled;
  }
  const section = matchAccessSection(path);
  return Boolean(section && access.sections[section]?.blocked);
}
