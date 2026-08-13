import type { Metadata, Viewport } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { getSiteUrl, SITE_NAME } from "@/lib/seo";
import { AppProviders } from "@/providers/app-providers";

import "@/styles/globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const siteUrl = getSiteUrl();
  const title = t("title");
  const description = t("description");
  const keywords = t.raw("keywords") as string[];

  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;
  const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    keywords: Array.isArray(keywords) ? keywords : undefined,
    authors: [{ name: "Vexira Labs LLC", url: siteUrl }],
    creator: "Vexira Labs LLC",
    publisher: "Vexira Labs LLC",
    category: "technology",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: "/",
      languages: {
        "x-default": "/",
        en: "/",
        tr: "/",
        ru: "/",
        az: "/",
      },
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: "/logo.png",
          width: 512,
          height: 512,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.png"],
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png" },
        { url: "/logo.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/favicon.png", type: "image/png" }],
      shortcut: "/favicon.png",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    verification: {
      ...(googleVerification ? { google: googleVerification } : {}),
      ...(yandexVerification ? { yandex: yandexVerification } : {}),
      ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
    },
    other: {
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": "#000000",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const locale = await getLocale();

  return (
    <html lang={locale} className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('vexira-theme')||'{}');var m=s.state&&s.state.mode||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
