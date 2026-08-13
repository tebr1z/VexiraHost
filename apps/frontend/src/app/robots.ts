import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const disallow = ["/dashboard/", "/auth/", "/payment/", "/cart/", "/api/", "/unsubscribe/"];

  const sharedRule = {
    allow: "/" as const,
    disallow,
  };

  return {
    rules: [
      { userAgent: "*", ...sharedRule },
      { userAgent: "Googlebot", ...sharedRule },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "Bingbot", ...sharedRule },
      { userAgent: "Yandex", ...sharedRule },
      { userAgent: "YandexBot", ...sharedRule },
      { userAgent: "DuckDuckBot", ...sharedRule },
      { userAgent: "Slurp", ...sharedRule },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
