import type { MetadataRoute } from "next";

import { locales } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const privatePaths = [
    "/dashboard",
    "/t4abriz",
    "/auth/",
    "/payment/",
    "/cart",
    "/unsubscribe",
    "/login",
    "/register",
  ];
  const disallow = [
    "/api/",
    ...locales.flatMap((locale) =>
      privatePaths.map((path) => (locale === "en" ? path : `/${locale}${path}`)),
    ),
  ];

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
