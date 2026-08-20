"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "./material-icon";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthHydration } from "@/features/auth/hooks/use-auth";
import { usePublicNavigation } from "@/features/navigation/hooks/use-public-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useMaintenanceStore } from "@/stores/maintenance-store";

type MobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Hamburger only — keep this inside the floating navbar. */
export function MobileMenuTrigger({ open, onOpenChange }: MobileMenuProps): React.ReactElement {
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={open ? t("closeMenu") : t("openMenu")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label)] lg:hidden"
      onClick={() => onOpenChange(!open)}
    >
      <MaterialIcon name={open ? "close" : "menu"} />
    </button>
  );
}

/**
 * Full-screen drawer — must NOT live under `.ios-nav-float` (backdrop-filter
 * turns position:fixed into a clipped local coordinate system at scroll top).
 */
export function MobileMenuDrawer({
  open,
  onOpenChange,
}: MobileMenuProps): React.ReactElement | null {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groups = usePublicNavigation();
  const { isReady, isAuthenticated } = useAuthHydration();
  const showSignedIn = isReady && isAuthenticated;
  const registerEnabled = useMaintenanceStore((s) => s.access.registerEnabled);
  const [mounted, setMounted] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    document.body.classList.toggle("mobile-nav-open", open);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("mobile-nav-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setExpandedKey(null);
      return;
    }
    const activeGroup = groups.find((group) =>
      group.items.some((item) => (item.pathMatch ? pathname.startsWith(item.pathMatch) : false)),
    );
    setExpandedKey(activeGroup?.key ?? null);
  }, [open, groups, pathname]);

  if (!mounted) return null;

  const close = () => onOpenChange(false);
  const toggleGroup = (key: string) => {
    setExpandedKey((current) => (current === key ? null : key));
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={t("closeMenu")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/45 dark:bg-black/65"
            onClick={close}
          />
          <motion.aside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed right-0 top-0 z-[210] flex h-[100dvh] w-[min(100vw,20rem)] flex-col border-l border-[var(--separator)] bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]"
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--separator)] bg-[var(--bg-elevated)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
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

            <div className="shrink-0 border-b border-[var(--separator)] bg-[var(--bg-elevated)] px-3 py-3">
              <div className="flex items-center justify-between gap-1 rounded-2xl bg-[var(--bg-secondary)] px-1.5 py-1.5 [&_ul]:left-0 [&_ul]:right-auto">
                <LanguageSwitcher />
                <CurrencySwitcher />
                <ThemeToggle />
              </div>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--bg-elevated)] px-2 py-2">
              {groups.map((group) => {
                const expanded = expandedKey === group.key;
                const groupActive = group.items.some((item) =>
                  item.pathMatch ? pathname.startsWith(item.pathMatch) : false,
                );

                return (
                  <div key={group.key} className="mb-1">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => toggleGroup(group.key)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-[15px] font-semibold transition-colors",
                        groupActive || expanded
                          ? "bg-[var(--bg-secondary)] text-[var(--label)]"
                          : "text-[var(--label)] active:bg-[var(--bg-secondary)]",
                      )}
                    >
                      <span>{group.label}</span>
                      <span
                        className={cn(
                          "material-symbols-outlined text-[20px] text-[var(--label-tertiary)] transition-transform duration-200",
                          expanded && "rotate-180",
                        )}
                      >
                        expand_more
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mb-1 ml-1 mt-0.5 flex flex-col border-l border-[var(--separator)] pl-2">
                            {group.items.map((item) => {
                              const active = item.pathMatch
                                ? pathname.startsWith(item.pathMatch)
                                : false;
                              const itemClass = cn(
                                "rounded-xl px-3 py-2.5 text-[14px] transition-colors",
                                active
                                  ? "bg-[var(--bg-secondary)] font-medium text-[var(--label)]"
                                  : "text-[var(--label-secondary)] active:bg-[var(--bg-secondary)] active:text-[var(--label)]",
                              );

                              return item.href.startsWith("/#") ? (
                                <a
                                  key={item.id}
                                  href={item.href}
                                  onClick={close}
                                  className={itemClass}
                                >
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
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            <div className="shrink-0 space-y-2 border-t border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                  {registerEnabled ? (
                    <Link
                      href="/register"
                      onClick={close}
                      className="ios-nav-cta flex w-full justify-center"
                    >
                      {t("deployNow")}
                    </Link>
                  ) : null}
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
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** @deprecated Prefer MobileMenuTrigger + MobileMenuDrawer outside ios-nav-float */
export function MobileMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MobileMenuTrigger open={open} onOpenChange={setOpen} />
      <MobileMenuDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
