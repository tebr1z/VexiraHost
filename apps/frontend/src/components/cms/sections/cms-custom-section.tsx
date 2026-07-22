"use client";

import { Link } from "@/i18n/navigation";

import { asString, CmsSectionShell } from "@/components/cms/cms-section-shell";
import type { PublicCmsSection } from "@/features/cms/types";

export function CmsCustomSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const c = section.content;
  const html = asString(c.html);
  const title = asString(c.title);
  const subtitle = asString(c.subtitle);
  const cta = asString(c.ctaText);
  const ctaHref = asString(c.ctaHref) || "/register";

  return (
    <CmsSectionShell design={section.design}>
      <div className="mx-auto max-w-container-max px-5 text-center md:px-8">
        {title && <h2 className="text-2xl font-semibold text-[var(--label)] sm:text-3xl">{title}</h2>}
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-[var(--label-secondary)]">{subtitle}</p>
        )}
        {html ? (
          <div
            className="prose prose-neutral mx-auto mt-6 max-w-3xl text-left dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
        {cta && (
          <div className="mt-8">
            {ctaHref.startsWith("http") ? (
              <a href={ctaHref} className="apple-btn apple-btn-primary px-8">
                {cta}
              </a>
            ) : (
              <Link href={ctaHref} className="apple-btn apple-btn-primary px-8">
                {cta}
              </Link>
            )}
          </div>
        )}
      </div>
    </CmsSectionShell>
  );
}
