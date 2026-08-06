"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { CmsSectionRenderer } from "./cms-section-renderer";

import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { fetchCmsPage, fetchCmsPageByPath } from "@/features/cms/services/cms.service";
import type { PublicCmsPage } from "@/features/cms/types";

type CmsPageViewProps =
  { slug: string; pathSegment?: never } | { slug?: never; pathSegment: string };

export function CmsPageView(props: CmsPageViewProps): React.ReactElement {
  const locale = useLocale();
  const [page, setPage] = useState<PublicCmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const pathSegment = "pathSegment" in props ? props.pathSegment : undefined;
  const slug = "slug" in props ? props.slug : undefined;

  useEffect(() => {
    setLoading(true);
    const loader = pathSegment
      ? fetchCmsPageByPath(pathSegment, locale)
      : fetchCmsPage(slug!, locale);

    loader.then(setPage).finally(() => setLoading(false));
  }, [pathSegment, slug, locale]);

  if (loading) {
    return (
      <div className="space-y-6 px-5 py-12 md:px-8">
        <LoadingSkeleton className="mx-auto h-48 max-w-3xl rounded-2xl" />
        <LoadingSkeleton className="mx-auto h-96 max-w-5xl rounded-2xl" />
      </div>
    );
  }

  if (!page || page.sections.length === 0) {
    return (
      <div className="px-5 py-20 text-center text-[var(--label-secondary)] md:px-8">
        <p>Sayfa içeriği henüz yapılandırılmamış.</p>
      </div>
    );
  }

  return (
    <>
      {page.sections.map((section) => (
        <CmsSectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
