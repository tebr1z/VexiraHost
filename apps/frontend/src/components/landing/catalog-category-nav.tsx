"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import type { CatalogCategory } from "@/features/catalog";
import { cn } from "@/lib/cn";

/** Product-category icons — clearer than generic language/memory glyphs. */
export const CATALOG_CATEGORY_ICONS: Record<string, string> = {
  HOSTING: "cloud",
  VPS: "terminal",
  DEDICATED: "storage",
  DOMAIN: "travel_explore",
  WHATSAPP_API: "forum",
  SSL: "lock",
  EMAIL: "alternate_email",
  LICENSE: "vpn_key",
  BACKUP: "cloud_sync",
};

export function catalogCategoryIcon(
  category: Pick<CatalogCategory, "systemType" | "slug">,
): string {
  return (
    CATALOG_CATEGORY_ICONS[(category.systemType ?? category.slug).toUpperCase()] ?? "deployed_code"
  );
}

type CatalogCategoryNavProps = {
  categories: CatalogCategory[];
  activeId: string | null;
  onChange: (id: string) => void;
  label: string;
  className?: string;
};

/**
 * Single-row category switcher with edge fades + optional chevrons.
 * Avoids wrapping into a tall icon grid when many categories exist.
 */
export function CatalogCategoryNav({
  categories,
  activeId,
  onChange,
  label,
  className,
}: CatalogCategoryNavProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categories, updateScrollState]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !activeId) return;
    const active = el.querySelector<HTMLElement>(`[data-category-id="${activeId}"]`);
    active?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId, reduceMotion]);

  const scrollByAmount = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(280, el.clientWidth * 0.7),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("relative w-full max-w-3xl", className)}>
      <div className="relative">
        {canPrev ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-[linear-gradient(90deg,var(--bg-grouped),transparent)]"
            aria-hidden
          />
        ) : null}
        {canNext ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-[linear-gradient(270deg,var(--bg-grouped),transparent)]"
            aria-hidden
          />
        ) : null}

        {canPrev ? (
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            className="absolute left-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--separator)] bg-[var(--bg-elevated)] text-[var(--label)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--separator))]"
            aria-label="Previous categories"
          >
            <MaterialIcon name="chevron_left" className="text-[20px]" />
          </button>
        ) : null}
        {canNext ? (
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            className="absolute right-0 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--separator)] bg-[var(--bg-elevated)] text-[var(--label)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--separator))]"
            aria-label="Next categories"
          >
            <MaterialIcon name="chevron_right" className="text-[20px]" />
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          role="tablist"
          aria-label={label}
          className="flex gap-1.5 overflow-x-auto px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat) => {
            const active = cat.id === activeId;
            return (
              <motion.button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-category-id={cat.id}
                onClick={() => onChange(cat.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg-elevated))] text-[var(--accent)]"
                    : "text-[var(--label-secondary)] hover:bg-[color-mix(in_srgb,var(--fill)_80%,transparent)] hover:text-[var(--label)]",
                )}
              >
                <MaterialIcon
                  name={catalogCategoryIcon(cat)}
                  className={cn(
                    "text-[17px] transition-colors",
                    active ? "text-[var(--accent)]" : "text-[var(--label-tertiary)]",
                  )}
                />
                <span className="whitespace-nowrap">{cat.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
