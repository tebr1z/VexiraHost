"use client";

import { MaterialIcon } from "@/components/landing/material-icon";
import { asString, asStringArray, CmsSectionShell } from "@/components/cms/cms-section-shell";
import type { PublicCmsSection } from "@/features/cms/types";
import { cn } from "@/lib/cn";

export function CmsIncludedSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const items = asStringArray(section.content.items);
  const cols = section.design.columns ?? 3;

  return (
    <CmsSectionShell design={section.design} className="apple-page border-y border-[var(--separator)]">
      <div className="mx-auto max-w-container-max px-5 md:px-8">
        <h2 className="mb-8 text-center text-xl font-semibold text-[var(--label)] sm:text-2xl">
          {asString(section.content.title)}
        </h2>
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            cols >= 2 && "sm:grid-cols-2",
            cols >= 3 && "lg:grid-cols-3",
          )}
        >
          {items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-[14px] bg-[var(--bg-secondary)] px-4 py-3.5"
            >
              <MaterialIcon name="check_circle" className="shrink-0 text-[20px] text-[var(--accent)]" />
              <span className="text-sm text-[var(--label-secondary)]">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </CmsSectionShell>
  );
}
