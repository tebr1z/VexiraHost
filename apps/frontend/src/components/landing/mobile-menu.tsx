"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CartNavButton } from "@/components/cart/cart-nav-button";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggleGroup } from "@/components/layout/theme-toggle";
import { usePublicNavigation } from "@/features/navigation/hooks/use-public-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

import { MaterialIcon } from "./material-icon";

export function MobileMenu(): React.ReactElement {
  const t = useTranslations("nav");
  const tp = useTranslations("pricing");
  const tCart = useTranslations("cart");
  const pathname = usePathname();
  const groups = usePublicNavigation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]"
        onClick={() => setOpen((p) => !p)}
      >
        <MaterialIcon name={open ? "close" : "menu"} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label={t("closeMenu")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm dark:bg-black/55"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-[22rem] flex-col border-l-[0.5px] border-[var(--separator)] bg-[var(--bg-elevated)] shadow-apple-md"
            >
              <div className="flex items-center justify-between border-b-[0.5px] border-[var(--separator)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--label)]">{t("menu")}</span>
                <button
                  type="button"
                  aria-label={t("closeMenu")}
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)]"
                >
                  <MaterialIcon name="close" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-3">
                {groups.map((group) => (
                  <div key={group.key} className="mb-3">
                    <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const active = item.pathMatch ? pathname.startsWith(item.pathMatch) : false;

                        return item.href.startsWith("/#") ? (
                          <a
                            key={item.id}
                            href={item.href}
                            onClick={close}
                            className={cn(
                              "rounded-[10px] px-3 py-2.5 text-[16px]",
                              active
                                ? "bg-[var(--fill)] font-medium text-[var(--label)]"
                                : "text-[var(--label-secondary)]",
                            )}
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={close}
                            className={cn(
                              "rounded-[10px] px-3 py-2.5 text-[16px]",
                              active
                                ? "bg-[var(--fill)] font-medium text-[var(--label)]"
                                : "text-[var(--label-secondary)]",
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="space-y-4 border-t-[0.5px] border-[var(--separator)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href="/cart"
                    onClick={close}
                    className="text-sm font-medium text-[var(--label-secondary)]"
                  >
                    {tCart("title")}
                  </Link>
                  <CartNavButton />
                </div>
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
                  <LanguageSwitcher variant="panel" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                    {t("theme")}
                  </p>
                  <ThemeToggleGroup className="w-full [&_.apple-segmented-item]:flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={close}
                    className="ios-nav-pill justify-center text-[var(--label-secondary)]"
                  >
                    {t("clientPortal")}
                  </Link>
                  <Link href="/register" onClick={close} className="ios-nav-cta justify-center">
                    {t("deployNow")}
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
