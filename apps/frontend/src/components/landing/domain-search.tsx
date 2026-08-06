"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { Link } from "@/i18n/navigation";

const TLD_CHIPS = [
  { key: "tldCom" as const, price: "$9.99" },
  { key: "tldNet" as const, price: "$11.99" },
  { key: "tldAi" as const, price: "$69.00" },
];

export function DomainSearch(): React.ReactElement {
  const t = useTranslations("domain");
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const goSearch = (value?: string) => {
    const domain = (value ?? query).trim();
    if (!domain) return;
    router.push(`/domains/search?q=${encodeURIComponent(domain)}`);
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goSearch();
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5 }}
      className="max-w-container-max relative z-10 mx-auto mt-10 px-5 pb-4 sm:mt-14 md:px-8"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-[var(--label-secondary)] sm:text-base">{t("subtitle")}</p>
      </div>

      <form
        onSubmit={handleSearch}
        className={[
          "shadow-apple-md relative mx-auto mt-5 flex max-w-3xl flex-col overflow-hidden rounded-[22px] border bg-[var(--bg-elevated)] transition-[border-color,box-shadow] duration-300 sm:mt-6 sm:flex-row sm:items-stretch sm:rounded-full",
          focused
            ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--separator))] shadow-[0_18px_50px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
            : "border-[var(--separator)]",
        ].join(" ")}
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <MaterialIcon
            name="language"
            className="pointer-events-none absolute left-5 text-[22px] text-[var(--accent)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t("placeholder")}
            aria-label={t("title")}
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full bg-transparent pl-14 pr-4 text-[16px] text-[var(--label)] outline-none placeholder:text-[var(--label-tertiary)] sm:h-[3.75rem] sm:text-[17px]"
          />
        </div>
        <div className="shrink-0 border-t border-[var(--separator)] p-2 sm:border-t-0 sm:p-2">
          <button
            type="submit"
            className="apple-btn apple-btn-primary h-11 w-full rounded-full px-6 sm:h-full sm:min-w-[8.5rem]"
          >
            {t("search")}
            <MaterialIcon name="arrow_forward" className="ml-1 text-[18px]" />
          </button>
        </div>
      </form>

      <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TLD_CHIPS.map((tld) => (
            <button
              key={tld.key}
              type="button"
              onClick={() => {
                const base = query.trim().replace(/\.[a-z0-9-]+$/i, "") || "brand";
                const ext = t(tld.key).replace(".", "");
                goSearch(`${base}.${ext}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--label-secondary)] transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--separator))] hover:text-[var(--accent)]"
            >
              <span className="font-semibold text-[var(--label)]">{t(tld.key)}</span>
              <span>{tld.price}</span>
            </button>
          ))}
        </div>
        <Link
          href="/domains/search"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] transition hover:opacity-80"
        >
          {t("advanced")}
        </Link>
      </div>
    </motion.div>
  );
}
