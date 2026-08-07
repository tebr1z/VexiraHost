import type { MetadataRoute } from "next";

import { BLOG_SLUGS } from "@/content/blog";

const publicPaths = ["/", "/hosting", "/vps", "/about", "/faq", "/blog", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vexirahost.com";
  const lastModified = new Date();

  const staticEntries = publicPaths.map((path) => ({
    url: new URL(path, baseUrl).toString(),
    lastModified,
    changeFrequency: (path === "/" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const blogEntries = BLOG_SLUGS.map((slug) => ({
    url: new URL(`/blog/${slug}`, baseUrl).toString(),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries];
}
