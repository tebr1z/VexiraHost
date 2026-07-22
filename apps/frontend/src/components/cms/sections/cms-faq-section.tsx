"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { asFaqItems, asString, CmsSectionShell } from "@/components/cms/cms-section-shell";
import type { PublicCmsSection } from "@/features/cms/types";

export function CmsFaqSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const items = asFaqItems(section.content.items);
  const [open, setOpen] = useState(0);

  return (
    <CmsSectionShell design={section.design} className="apple-page">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <h2 className="mb-8 text-center text-2xl font-semibold text-[var(--label)] sm:text-3xl">
          {asString(section.content.title)}
        </h2>
        <div className="divide-y divide-[var(--separator)] rounded-[16px] border border-[var(--separator)] bg-[var(--bg-elevated)]">
          {items.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={`${item.question}-${index}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-[var(--label)]">{item.question}</span>
                  <MaterialIcon
                    name={isOpen ? "expand_less" : "expand_more"}
                    className="shrink-0 text-[var(--label-tertiary)]"
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--label-secondary)]">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </CmsSectionShell>
  );
}
