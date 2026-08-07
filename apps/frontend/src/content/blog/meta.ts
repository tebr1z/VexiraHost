import type { BlogPostMeta } from "./types";

/** Shared post metadata — content lives in locale files. */
export const BLOG_POST_META: BlogPostMeta[] = [
  {
    slug: "vps-vs-vds",
    category: "vps",
    publishedAt: "2026-08-01",
    ctaHref: "/vps",
  },
  {
    slug: "shared-hosting-yoxsa-vps",
    category: "hosting",
    publishedAt: "2026-08-02",
    ctaHref: "/hosting",
  },
  {
    slug: "hosting-nedir",
    category: "hosting",
    publishedAt: "2026-08-03",
    ctaHref: "/hosting",
  },
  {
    slug: "whatsapp-api-nedir",
    category: "whatsapp",
    publishedAt: "2026-08-04",
    ctaHref: "/products/whatsapp-api",
  },
  {
    slug: "wordpress-hosting-vps",
    category: "hosting",
    publishedAt: "2026-08-05",
    ctaHref: "/hosting",
  },
  {
    slug: "whatsapp-api-rest-limitler",
    category: "whatsapp",
    publishedAt: "2026-08-06",
    ctaHref: "/products/whatsapp-api",
  },
  {
    slug: "vps-cpu-ram-nvme",
    category: "vps",
    publishedAt: "2026-08-07",
    ctaHref: "/vps",
  },
  {
    slug: "uptime-ssl-backup",
    category: "hosting",
    publishedAt: "2026-08-07",
    ctaHref: "/hosting",
  },
];

export const BLOG_SLUGS = BLOG_POST_META.map((p) => p.slug);
