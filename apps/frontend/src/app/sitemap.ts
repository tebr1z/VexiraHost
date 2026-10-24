import type { MetadataRoute } from "next";

import { BLOG_SLUGS } from "@/content/blog";
import { locales } from "@/i18n/routing";
import { productPath } from "@/lib/product-path";
import { getSiteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo";
import { publicProducts, publicCategories } from "@/lib/server-catalog";

export const dynamic = "force-dynamic";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const [products, categories] = await Promise.all([publicProducts(), publicCategories()]);
  const paths = [
    ...new Set([
      ...products.map(productPath),
      ...categories.map((category) => `/products/${encodeURIComponent(category.slug)}`),
    ]),
  ];
  const productEntries = paths.flatMap((path) =>
    locales.map((locale) => ({
      url: localizedUrl(baseUrl, locale, path),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: alternates(baseUrl, path) },
    })),
  );
  return [...staticEntries, ...blogEntries, ...productEntries];
}
