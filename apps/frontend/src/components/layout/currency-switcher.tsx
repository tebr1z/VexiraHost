"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { updateUserPreferences } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";
import { usePricingStore, type AppCurrency } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

const OPTIONS: AppCurrency[] = ["USD", "EUR", "AZN"];

const CURRENCY_META: Record<AppCurrency, { symbol: string; nameKey: "currencyUsd" | "currencyEur" | "currencyAzn" }> = {
  USD: { symbol: "$", nameKey: "currencyUsd" },
  EUR: { symbol: "€", nameKey: "currencyEur" },
  AZN: { symbol: "₼", nameKey: "currencyAzn" },
};

function useCurrencySwitcherState() {
  const t = useTranslations("pricing");
  const currency = usePricingStore((s) => s.currency);
  const currencyLocked = usePricingStore((s) => s.currencyLocked);
  const countryCode = usePricingStore((s) => s.countryCode);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [saving, setSaving] = useState(false);

  const locked = Boolean(currencyLocked || countryCode === "AZ" || user?.currencyLocked);
  const activeCurrency: AppCurrency = locked ? "AZN" : currency;
  const canChange = user ? Boolean(user.canChangeCurrency) : true;
  const disabled = locked || saving || (Boolean(user) && !canChange);

  const handleSelect = async (next: AppCurrency) => {
    if (locked) {
      setCurrency("AZN");
      return;
    }

    if (next === activeCurrency) return;

    if (!user) {
      setCurrency(next);
      return;
    }

    if (!canChange && next !== (user.preferredCurrency as AppCurrency)) {
      toast(t("changeCooldown"), "error");
      return;
    }

    setSaving(true);
    try {
      const profile = await updateUserPreferences({
        preferredCurrency: next,
        countryCode,
      });
      if (accessToken && refreshToken) {
        setSession({
          user: { ...user, ...profile },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: "15m",
          },
        });
      }
      setFromUser({
        preferredCurrency: profile.preferredCurrency,
        billingPeriod: profile.billingPeriod,
        currencyLocked: profile.currencyLocked,
      });
      toast(t("currencyUpdated"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, t("changeCooldown")), "error");
    } finally {
      setSaving(false);
    }
  };

  const title = locked ? t("azLocked") : !canChange ? t("changeCooldown") : t("currency");

  return {
    t,
    activeCurrency,
    disabled,
    locked,
    saving,
    handleSelect,
    title,
  };
}

function CurrencySymbol({ code, className }: { code: AppCurrency; className?: string }): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[11px] font-bold text-[var(--accent)]",
        className,
      )}
      aria-hidden
    >
      {CURRENCY_META[code].symbol}
    </span>
  );
}

export function CurrencySwitcher({
  className,
  variant = "dropdown",
}: {
  className?: string;
  variant?: "dropdown" | "segmented";
}): React.ReactElement {
  const { t, activeCurrency, disabled, locked, saving, handleSelect, title } = useCurrencySwitcherState();
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

  if (variant === "segmented") {
    return (
      <div className={cn("apple-segmented w-fit", className)} role="group" aria-label={t("currency")}>
        {OPTIONS.map((code) => {
          const active = activeCurrency === code;
          const optionDisabled = disabled || (locked && code !== "AZN");
          return (
            <button
              key={code}
              type="button"
              data-active={active}
              disabled={optionDisabled}
              title={title}
              onClick={() => void handleSelect(code)}
              className={cn(
                "apple-segmented-item inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50",
                active && "font-semibold",
              )}
            >
              <CurrencySymbol code={code} className="h-4 w-4 text-[10px]" />
              <span>{code}</span>
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
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("currency")}
        aria-busy={saving}
        title={title}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition",
          "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          open && "bg-[var(--fill-secondary)] text-[var(--label)]",
        )}
      >
        {locked ? (
          <span className="material-symbols-outlined text-[16px] text-[var(--label-tertiary)]">lock</span>
        ) : (
          <span className="material-symbols-outlined text-[16px]">payments</span>
        )}
        <CurrencySymbol code={activeCurrency} />
        <span className="uppercase tracking-wide">{activeCurrency}</span>
        {!disabled && (
          <span
            className={cn(
              "material-symbols-outlined text-[16px] text-[var(--label-tertiary)] transition",
              open && "rotate-180",
            )}
          >
            expand_more
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-label={t("currency")}
            className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-[14px] border-[0.5px] border-[var(--separator)] bg-[var(--bg-elevated)] p-1 shadow-apple-md"
          >
            {OPTIONS.map((code) => {
              const active = code === activeCurrency;
              const meta = CURRENCY_META[code];
              return (
                <li key={code} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void handleSelect(code);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-[var(--fill)] font-medium text-[var(--label)]"
                        : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)]",
                    )}
                  >
                    <CurrencySymbol code={code} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold tracking-wide">{code}</span>
                      <span className="text-xs text-[var(--label-tertiary)]">{t(meta.nameKey)}</span>
                    </span>
                    {active && (
                      <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">check</span>
                    )}
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
