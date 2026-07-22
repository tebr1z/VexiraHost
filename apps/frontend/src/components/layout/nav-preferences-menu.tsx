"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggleGroup } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/cn";

export function NavPreferencesMenu({ className }: { className?: string }): React.ReactElement {
  const t = useTranslations("nav");
  const tp = useTranslations("pricing");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("preferences")}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--label-secondary)] transition",
          "hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]",
          open && "bg-[var(--fill-secondary)] text-[var(--label)]",
        )}
      >
        <span className="material-symbols-outlined text-[20px]">tune</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label={t("preferences")}
            className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[16px] border-[0.5px] border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-apple-md"
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                  {tp("currency")}
                </p>
                <CurrencySwitcher variant="segmented" className="apple-segmented-block [&_.apple-segmented-item]:flex-1" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                  {t("language")}
                </p>
                <LanguageSwitcher variant="panel" className="w-full" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                  {t("theme")}
                </p>
                <ThemeToggleGroup className="w-full [&_.apple-segmented-item]:flex-1" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
