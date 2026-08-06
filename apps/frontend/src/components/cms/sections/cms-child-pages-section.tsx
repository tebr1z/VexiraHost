"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { asString, CmsSectionShell } from "@/components/cms/cms-section-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { fetchCmsChildPages } from "@/features/cms/services/cms.service";
import type { PublicCmsChildPage, PublicCmsSection } from "@/features/cms/types";
import { Link } from "@/i18n/navigation";

export function CmsChildPagesSection({
  section,
}: {
  section: PublicCmsSection;
}): React.ReactElement {
  const locale = useLocale();
  const parentSlug = asString(section.content.parentSlug);
  const title = asString(section.content.title);
  const subtitle = asString(section.content.subtitle);
  const [children, setChildren] = useState<PublicCmsChildPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentSlug) {
      setChildren([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchCmsChildPages(parentSlug, locale)
      .then(setChildren)
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, [parentSlug, locale]);

  return (
    <CmsSectionShell section={section} className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl">
        {title ? (
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-[var(--label)] md:text-3xl">{title}</h2>
            {subtitle ? <p className="mt-2 text-[var(--label-secondary)]">{subtitle}</p> : null}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <LoadingSkeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <p className="text-center text-sm text-[var(--label-secondary)]">
            {asString(section.content.emptyMessage) || "Henüz alt sayfa eklenmemiş."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) =>
              child.href ? (
                <Link
                  key={child.slug}
                  href={child.href}
                  className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--accent)]"
                >
                  <h3 className="text-lg font-semibold text-[var(--label)]">{child.title}</h3>
                  <p className="mt-1 text-xs text-[var(--label-tertiary)]">{child.href}</p>
                </Link>
              ) : null,
            )}
          </div>
        )}
      </div>
    </CmsSectionShell>
  );
}
