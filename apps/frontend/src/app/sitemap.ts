import type { MetadataRoute } from "next";

import { BLOG_SLUGS } from "@/content/blog";
import { getSiteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = SEO_PUBLIC_PATHS.map((entry) => ({
    url: entry.path === "/" ? `${baseUrl}/` : `${baseUrl}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = BLOG_SLUGS.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  return [...staticEntries, ...blogEntries];
}
