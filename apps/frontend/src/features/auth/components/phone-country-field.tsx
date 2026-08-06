"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { cn } from "@/lib/cn";
import {
  COUNTRY_DIAL_CODES,
  countryFlagUrl,
  findDialByIso2,
  type CountryDialCode,
} from "@/lib/phone/country-dial-codes";

type PhoneCountryFieldProps = {
  label: string;
  optionalHint?: string;
  dialIso2: string;
  nationalNumber: string;
  onDialIso2Change: (iso2: string) => void;
  onNationalNumberChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
};

function CountryFlag({
  iso2,
  size = 20,
  className,
}: {
  iso2: string;
  size?: number;
  className?: string;
}): React.ReactElement {
  const width = size <= 16 ? 20 : size <= 20 ? 40 : 80;
  return (
    <Image
      src={countryFlagUrl(iso2, width)}
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * 0.75)}
      className={cn(
        "shrink-0 rounded-[3px] object-cover shadow-sm ring-1 ring-black/10",
        className,
      )}
      unoptimized
    />
  );
}

export function PhoneCountryField({
  label,
  optionalHint,
  dialIso2,
  nationalNumber,
  onDialIso2Change,
  onNationalNumberChange,
  error,
  disabled,
  className,
}: PhoneCountryFieldProps): React.ReactElement {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const inputId = `${id}-national`;
  const searchId = `${id}-search`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => findDialByIso2(dialIso2) ?? COUNTRY_DIAL_CODES.find((c) => c.iso2 === "AZ")!,
    [dialIso2],
  );
  const dial = selected.dial;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter((c) => {
      const name = c.name.toLowerCase();
      const iso = c.iso2.toLowerCase();
      const code = c.dial;
      return name.includes(q) || iso.includes(q) || code.includes(q) || `+${code}`.includes(q);
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = COUNTRY_DIAL_CODES.findIndex((c) => c.iso2 === selected.iso2);
    setHighlight(idx >= 0 ? idx : 0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, selected.iso2]);

  useEffect(() => {
    if (!open) return;
    setHighlight((h) => (filtered.length === 0 ? 0 : Math.min(h, filtered.length - 1)));
  }, [filtered, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const pick = (country: CountryDialCode) => {
    onDialIso2Change(country.iso2);
    setOpen(false);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[highlight];
      if (item) pick(item);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (filtered.length) setHighlight(filtered.length - 1);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 px-1">
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--label)]">
          {label}
          {optionalHint ? (
            <span className="ml-1.5 font-normal text-[var(--label-tertiary)]">{optionalHint}</span>
          ) : null}
        </label>
      </div>

      <div
        className={cn(
          "auth-field relative flex overflow-visible rounded-2xl transition",
          error && "auth-field-error",
          disabled && "opacity-60",
        )}
      >
        <div ref={rootRef} className="relative shrink-0 border-r border-[var(--separator)]">
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-label={label}
            onClick={() => !disabled && setOpen((v) => !v)}
            className="inline-flex h-[3.5rem] min-w-[7.25rem] items-center gap-2 bg-transparent px-3 text-left text-sm font-medium text-[var(--label)] outline-none transition hover:bg-[var(--fill-secondary)] disabled:cursor-not-allowed sm:min-w-[8.5rem]"
          >
            <CountryFlag iso2={selected.iso2} size={22} />
            <span className="tabular-nums">+{dial}</span>
            <MaterialIcon
              name="expand_more"
              className={cn(
                "ml-auto text-[18px] text-[var(--label-tertiary)] transition",
                open && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.15 }}
                className="shadow-apple-md absolute left-0 top-[calc(100%+0.4rem)] z-[70] w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)]"
              >
                <div className="border-b border-[var(--separator)] p-2">
                  <label htmlFor={searchId} className="sr-only">
                    Search countries
                  </label>
                  <div className="relative">
                    <MaterialIcon
                      name="search"
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--label-tertiary)]"
                    />
                    <input
                      ref={searchRef}
                      id={searchId}
                      type="search"
                      autoComplete="off"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onSearchKeyDown}
                      placeholder="Country or code…"
                      className="h-10 w-full rounded-xl border-0 bg-[var(--bg-secondary)] py-2 pl-9 pr-3 text-sm text-[var(--label)] outline-none ring-1 ring-transparent placeholder:text-[var(--label-tertiary)] focus:ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                    />
                  </div>
                </div>

                <ul
                  ref={listRef}
                  id={listboxId}
                  role="listbox"
                  aria-label={label}
                  className="max-h-56 overflow-y-auto overscroll-contain p-1"
                >
                  {filtered.length === 0 ? (
                    <li className="px-3 py-4 text-center text-sm text-[var(--label-tertiary)]">
                      No countries found
                    </li>
                  ) : (
                    filtered.map((c, index) => {
                      const active = c.iso2 === selected.iso2;
                      const highlighted = index === highlight;
                      return (
                        <li key={c.iso2} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            data-index={index}
                            onMouseEnter={() => setHighlight(index)}
                            onClick={() => pick(c)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left text-sm transition",
                              highlighted || active
                                ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--label)]"
                                : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)]",
                              active && "font-medium",
                            )}
                          >
                            <CountryFlag iso2={c.iso2} size={20} />
                            <span className="min-w-0 flex-1 truncate">{c.name}</span>
                            <span className="shrink-0 tabular-nums text-[var(--label-tertiary)]">
                              +{c.dial}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden rounded-r-2xl">
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-xs font-medium text-[var(--label-tertiary)]">
            +{dial}
          </span>
          <input
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            value={nationalNumber}
            onChange={(e) => onNationalNumberChange(e.target.value)}
            placeholder="50 123 45 67"
            className="auth-field-input !rounded-none border-0 bg-transparent py-3 pl-[3.25rem] pr-3 shadow-none"
          />
        </div>
      </div>

      {error ? <p className="text-error px-1 text-sm">{error}</p> : null}
    </div>
  );
}
