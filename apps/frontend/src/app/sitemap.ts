import type { MetadataRoute } from "next";

import { BLOG_SLUGS } from "@/content/blog";
import { locales } from "@/i18n/routing";
import { getSiteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo";

function localizedUrl(baseUrl: string, locale: string, path: string): string {
  const normalizedPath = path === "/" ? "" : path;
  return locale === "en"
    ? `${baseUrl}${normalizedPath || "/"}`
    : `${baseUrl}/${locale}${normalizedPath}`;
}

function alternates(baseUrl: string, path: string): Record<string, string> {
  return {
    "x-default": localizedUrl(baseUrl, "en", path),
    ...Object.fromEntries(locales.map((locale) => [locale, localizedUrl(baseUrl, locale, path)])),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = SEO_PUBLIC_PATHS.flatMap((entry) =>
    locales.map((locale) => ({
      url: localizedUrl(baseUrl, locale, entry.path),
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: { languages: alternates(baseUrl, entry.path) },
    })),
  );

  const blogEntries: MetadataRoute.Sitemap = BLOG_SLUGS.flatMap((slug) => {
    const path = `/blog/${slug}`;
    return locales.map((locale) => ({
      url: localizedUrl(baseUrl, locale, path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
      alternates: { languages: alternates(baseUrl, path) },
    }));
  });

  return [...staticEntries, ...blogEntries];
}
