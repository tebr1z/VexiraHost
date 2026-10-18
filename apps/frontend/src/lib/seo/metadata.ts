import type { Metadata } from "next";

import { absoluteUrl, getSiteUrl, SITE_NAME } from "./site";

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  locale?: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
  absoluteTitle?: boolean;
};

const SEO_LOCALES = ["en", "tr", "ru", "az"] as const;

function localizedPath(path: string, locale: string): string {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return locale === "en" ? normalizedPath || "/" : `/${locale}${normalizedPath}`;
}

function languageAlternates(path: string): Record<string, string> {
  return {
    "x-default": absoluteUrl(localizedPath(path, "en")),
    ...Object.fromEntries(
      SEO_LOCALES.map((locale) => [locale, absoluteUrl(localizedPath(path, locale))]),
    ),
  };
}

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(localizedPath(input.path, input.locale ?? "en"));
  const image = absoluteUrl(input.image ?? "/logo.png");
  const ogType = input.type ?? "website";

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: url,
      languages: languageAlternates(input.path),
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

export function serviceJsonLd(input: {
  name: string;
  description: string;
  path: string;
  locale: string;
}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@type": "Service",
    "@id": `${absoluteUrl(localizedPath(input.path, input.locale))}#service`,
    name: input.name,
    description: input.description,
    url: absoluteUrl(localizedPath(input.path, input.locale)),
    provider: { "@id": `${siteUrl}/#organization` },
    areaServed: "Worldwide",
    serviceType: "Web hosting",
    inLanguage: input.locale,
  };
}

export function faqJsonLd(
  items: Array<{ question?: string; answer?: string }>,
): Record<string, unknown> | null {
  const validItems = items.filter((item): item is { question: string; answer: string } =>
    Boolean(item.question?.trim() && item.answer?.trim()),
  );
  if (validItems.length === 0) return null;

  return {
    "@type": "FAQPage",
    mainEntity: validItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
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
