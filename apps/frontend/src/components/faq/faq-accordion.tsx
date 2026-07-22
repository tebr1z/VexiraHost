"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { cn } from "@/lib/cn";

export type FaqItem = { id: string; question: string; answer: string };
export type FaqCategory = { id: string; title: string; items: FaqItem[] };

export function FaqAccordion({
  categories,
  className,
}: {
  categories: FaqCategory[];
  className?: string;
}): React.ReactElement {
  const [openId, setOpenId] = useState<string | null>(categories[0]?.items[0]?.id ?? null);

  return (
    <div className={cn("space-y-10", className)}>
      {categories.map((category) => (
        <section key={category.id}>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--label)] sm:text-2xl">
            {category.title}
          </h2>
          <div className="divide-y divide-[var(--separator)] rounded-[16px] border border-[var(--separator)] bg-[var(--bg-elevated)]">
            {category.items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : item.id)}
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
                    <div className="px-5 pb-4 text-sm leading-relaxed text-[var(--label-secondary)] sm:text-[15px]">
                      {item.answer.split("\n").map((paragraph) => (
                        <p key={paragraph} className="mt-2 first:mt-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
