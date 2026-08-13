import type { Metadata } from "next";

import { absoluteUrl, getSiteUrl, SITE_NAME } from "./site";

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl(input.image ?? "/logo.png");
  const ogType = input.type ?? "website";

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: ogType,
      url,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      locale: undefined,
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: SITE_NAME,
        },
      ],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    other: {
      // Helps Yandex / generic crawlers discover the preferred URL.
      "og:url": url,
      "twitter:url": url,
    },
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: SITE_NAME,
    legalName: "Vexira Labs LLC",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo.png`,
    },
    image: `${siteUrl}/logo.png`,
    sameAs: [],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "admin@vexirahost.com",
        availableLanguage: ["az", "tr", "en", "ru"],
      },
    ],
  };
}

export function websiteJsonLd(description: string): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: SITE_NAME,
    url: siteUrl,
    description,
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: ["az", "tr", "en", "ru"],
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  locale: string;
}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    inLanguage: input.locale,
    mainEntityOfPage: absoluteUrl(input.path),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    image: [`${siteUrl}/logo.png`],
  };
}
