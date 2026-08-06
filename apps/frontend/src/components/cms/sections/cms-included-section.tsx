"use client";

import { asString, CmsSectionShell } from "@/components/cms/cms-section-shell";
import { MaterialIcon } from "@/components/landing/material-icon";
import type { PublicCmsSection } from "@/features/cms/types";
import { cn } from "@/lib/cn";

type IncludedItem = { icon: string; label: string };

function resolveItems(value: unknown): IncludedItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): IncludedItem | null => {
      if (typeof item === "string" && item.trim()) {
        return { icon: "check_circle", label: item };
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const label =
          (typeof record.label === "string" && record.label) ||
          (typeof record.text === "string" && record.text) ||
          "";
        if (!label.trim()) return null;
        return {
          icon: typeof record.icon === "string" && record.icon ? record.icon : "check_circle",
          label,
        };
      }
      return null;
    })
    .filter((item): item is IncludedItem => item != null);
}

export function CmsIncludedSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const items = resolveItems(section.content.items);
  const cols = section.design.columns ?? 3;

  return (
    <CmsSectionShell
      design={section.design}
      className="apple-page border-y border-[var(--separator)]"
    >
      <div className="max-w-container-max mx-auto px-5 md:px-8">
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
              key={`${item.icon}-${item.label}`}
              className="flex items-start gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--separator)_70%,transparent)] bg-[color-mix(in_srgb,var(--bg-elevated)_90%,transparent)] px-4 py-3.5 shadow-[0_1px_0_color-mix(in_srgb,white_30%,transparent)_inset]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                <MaterialIcon name={item.icon} className="text-[22px] text-[var(--accent)]" />
              </span>
              <span className="pt-2 text-sm leading-snug text-[var(--label-secondary)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CmsSectionShell>
  );
}
