"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { type ThemeMode, useThemeStore } from "@/stores/theme-store";

const MODES: ThemeMode[] = ["light", "dark", "system"];

export function ThemeToggle({ className }: { className?: string }): React.ReactElement {
  const t = useTranslations("errors.theme");
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const cycle = () => {
    const idx = MODES.indexOf(mode);
    setMode(MODES[(idx + 1) % MODES.length] ?? "system");
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t("label")}
      title={`${t("label")}: ${t(mode)}`}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]",
        className,
      )}
    >
      <span className="material-symbols-outlined text-[18px]">
        {mode === "dark" ? "dark_mode" : mode === "light" ? "light_mode" : "contrast"}
      </span>
    </button>
  );
}

export function ThemeToggleGroup({ className }: { className?: string }): React.ReactElement {
  const t = useTranslations("errors.theme");
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className={cn("apple-segmented", className)} role="group" aria-label={t("label")}>
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          data-active={mode === m}
          className="apple-segmented-item"
        >
          {t(m)}
        </button>
      ))}
    </div>
  );
}
