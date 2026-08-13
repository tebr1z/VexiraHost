export const SITE_NAME = "Vexira Host";
export const SITE_LEGAL_NAME = "Vexira Labs LLC";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://vexirahost.com").replace(/\/$/, "");
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Public marketing paths included in sitemap (no auth / dashboard). */
export const SEO_PUBLIC_PATHS: Array<{
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/hosting", changeFrequency: "weekly", priority: 0.9 },
  { path: "/vps", changeFrequency: "weekly", priority: 0.9 },
  { path: "/domains", changeFrequency: "weekly", priority: 0.85 },
  { path: "/products/whatsapp-api", changeFrequency: "weekly", priority: 0.85 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/design", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/webmail", changeFrequency: "monthly", priority: 0.6 },
  { path: "/email", changeFrequency: "monthly", priority: 0.6 },
  { path: "/forum", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
];
