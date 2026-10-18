import { asFaqItems, asString, CmsSectionShell } from "@/components/cms/cms-section-shell";
import { MaterialIcon } from "@/components/landing/material-icon";
import type { PublicCmsSection } from "@/features/cms/types";

export function CmsFaqSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const items = asFaqItems(section.content.items);

  return (
    <CmsSectionShell design={section.design} className="apple-page">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <h2 className="mb-8 text-center text-2xl font-semibold text-[var(--label)] sm:text-3xl">
          {asString(section.content.title)}
        </h2>
        <div className="overflow-hidden rounded-[24px] border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-[0_16px_50px_rgba(0,0,0,0.055)]">
          {items.map((item, index) => (
            <details
              key={`${item.question}-${index}`}
              className="group border-b border-[var(--separator)] last:border-b-0"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-[var(--label)]">{item.question}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--fill-secondary)] text-[var(--label-tertiary)] transition-transform group-open:rotate-180">
                  <MaterialIcon name="expand_more" className="text-[19px]" />
                </span>
              </summary>
              <p className="max-w-2xl px-5 pb-5 text-sm leading-7 text-[var(--label-secondary)] sm:px-6">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </CmsSectionShell>
  );
}
