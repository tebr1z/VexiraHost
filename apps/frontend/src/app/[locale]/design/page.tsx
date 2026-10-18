import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { getTranslations } from "next-intl/server";

import { DesignExperience } from "@/components/design/design-experience";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, buildPageMetadata, organizationJsonLd } from "@/lib/seo";

const designDisplayFont = Newsreader({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-vd-display",
  display: "swap",
});

const designBodyFont = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vd-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("design");
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/design",
    keywords: t.raw("keywords") as string[],
  });
}

export default async function DesignPage(): Promise<React.ReactElement> {
  const t = await getTranslations("design");

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: "Vexira Host", path: "/" },
            { name: t("kicker"), path: "/design" },
          ]),
        ]}
      />
      <DesignExperience
        fontClassName={`${designDisplayFont.variable} ${designBodyFont.variable}`}
      />
    </>
  );
}
