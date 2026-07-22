"use client";

import { MaterialIcon } from "@/components/landing/material-icon";
import { asBlocks, CmsSectionShell } from "@/components/cms/cms-section-shell";
import type { PublicCmsSection } from "@/features/cms/types";

export function CmsFeaturesSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const blocks = asBlocks(section.content.blocks);
  const alternating = section.design.layout === "alternating";

  return (
    <CmsSectionShell design={section.design} className="apple-grouped">
      {blocks.map((block, index) => {
        const reversed =
          alternating && (block.layout === "right" || (block.layout !== "left" && index % 2 === 1));
        return (
          <section
            key={`${block.title}-${index}`}
            className="border-b border-[var(--separator)] py-14 last:border-b-0 sm:py-16"
          >
            <div
              className={`mx-auto flex max-w-container-max flex-col gap-8 px-5 md:px-8 lg:items-center ${
                reversed ? "lg:flex-row-reverse" : "lg:flex-row"
              }`}
            >
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                  {block.title}
                </h2>
                <p className="mt-3 text-[17px] leading-relaxed text-[var(--label-secondary)]">
                  {block.description}
                </p>
                {(block.bullets ?? []).length > 0 && (
                  <ul className="mt-6 space-y-2.5">
                    {block.bullets!.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2 text-sm text-[var(--label-secondary)]"
                      >
                        <MaterialIcon name="check" className="mt-0.5 text-[16px] text-[var(--success)]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center">
                <div className="flex h-48 w-full max-w-sm items-center justify-center rounded-[24px] border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-apple-md">
                  {section.design.imageUrl ? (
                    <img
                      src={section.design.imageUrl}
                      alt=""
                      className="h-full w-full rounded-[24px] object-cover"
                    />
                  ) : (
                    <MaterialIcon
                      name={block.icon ?? section.design.icon ?? "star"}
                      className="text-[64px] text-[var(--accent)] opacity-80"
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </CmsSectionShell>
  );
}
