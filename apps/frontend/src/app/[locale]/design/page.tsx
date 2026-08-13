import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DesignExperience } from "@/components/design/design-experience";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, buildPageMetadata, organizationJsonLd } from "@/lib/seo";

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
      <DesignExperience />
    </>
  );
}
