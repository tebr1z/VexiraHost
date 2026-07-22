"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { LocaleFlag } from "@/components/i18n/locale-flag";
import { locales, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({
  className = "",
  variant = "dropdown",
}: {
  className?: string;
  variant?: "dropdown" | "panel";
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("lang");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

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

  const selectLocale = (next: AppLocale) => {
    setOpen(false);
    if (next === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: next });
      router.refresh();
    });
  };

  if (variant === "panel") {
    return (
      <div className={cn("grid grid-cols-2 gap-1.5", className)} role="listbox" aria-label={tCommon("language")}>
        {locales.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={active}
              disabled={isPending}
              onClick={() => selectLocale(code)}
              className={cn(
                "flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm transition",
                active
                  ? "bg-[var(--fill)] font-medium text-[var(--label)]"
                  : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)]",
              )}
            >
              <LocaleFlag locale={code} size={18} />
              <span>{t(code)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={tCommon("language")}
        aria-busy={isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label)] disabled:opacity-60"
      >
        <LocaleFlag locale={locale} size={16} />
        <span className="uppercase tracking-wide">{locale}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-label={tCommon("language")}
            className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-[14px] border-[0.5px] border-[var(--separator)] bg-[var(--bg-elevated)] p-1 shadow-apple-md"
          >
            {locales.map((code) => {
              const active = code === locale;
              return (
                <li key={code} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => selectLocale(code)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-[var(--fill)] font-medium text-[var(--label)]"
                        : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)]",
                    )}
                  >
                    <LocaleFlag locale={code} size={18} />
                    <span>{t(code)}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
