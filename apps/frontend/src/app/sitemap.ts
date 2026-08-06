import type { MetadataRoute } from "next";

const publicPaths = ["/", "/hosting", "/vps", "/about", "/faq", "/blog", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vexirahost.com";
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: new URL(path, baseUrl).toString(),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
