import type { MetadataRoute } from "next";

import { getSiteUrl, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Vexira Host",
    description: "Premium hosting, VPS, domains, and digital products.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1768e8",
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icon-192.png?v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
    id: getSiteUrl(),
  };
}
