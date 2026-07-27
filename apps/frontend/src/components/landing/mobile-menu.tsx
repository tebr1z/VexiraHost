"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { MaterialIcon } from "./material-icon";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthHydration } from "@/features/auth/hooks/use-auth";
import { usePublicNavigation } from "@/features/navigation/hooks/use-public-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function MobileMenu(): React.ReactElement {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groups = usePublicNavigation();
  const { isReady, isAuthenticated } = useAuthHydration();
  const showSignedIn = isReady && isAuthenticated;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
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
              className="fixed inset-0 z-40 bg-black/35 dark:bg-black/55"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="shadow-apple-md fixed inset-y-0 right-0 isolate z-50 flex w-[min(100vw,20rem)] flex-col bg-[var(--bg-elevated)]"
            >
              <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
                <span className="text-[15px] font-semibold text-[var(--label)]">{t("menu")}</span>
                <button
                  type="button"
                  aria-label={t("closeMenu")}
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  <MaterialIcon name="close" />
                </button>
              </div>

              <div className="mx-3 mb-2 flex items-center justify-between gap-1 rounded-2xl bg-[var(--bg-secondary)] px-1.5 py-1.5 [&_ul]:left-0 [&_ul]:right-auto">
                <LanguageSwitcher />
                <CurrencySwitcher />
                <ThemeToggle />
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1">
                {groups.map((group) => (
                  <div key={group.key} className="mb-2">
                    <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--label-tertiary)]">
                      {group.label}
                    </p>
                    <div className="flex flex-col">
                      {group.items.map((item) => {
                        const active = item.pathMatch ? pathname.startsWith(item.pathMatch) : false;
                        const itemClass = cn(
                          "rounded-xl px-3 py-2.5 text-[15px] transition-colors",
                          active
                            ? "bg-[var(--bg-secondary)] font-medium text-[var(--label)]"
                            : "text-[var(--label)] active:bg-[var(--bg-secondary)]",
                        );

                        return item.href.startsWith("/#") ? (
                          <a key={item.id} href={item.href} onClick={close} className={itemClass}>
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={close}
                            className={itemClass}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="space-y-2 border-t border-[var(--separator)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {showSignedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className="ios-nav-cta flex w-full justify-center"
                  >
                    {t("clientPortal")}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      onClick={close}
                      className="ios-nav-cta flex w-full justify-center"
                    >
                      {t("deployNow")}
                    </Link>
                    <Link
                      href="/login"
                      onClick={close}
                      className="flex w-full items-center justify-center py-2 text-sm font-medium text-[var(--label-secondary)]"
                    >
                      {t("signIn")}
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
