"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggleGroup } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/cn";

export type ErrorShellVariant = "404" | "403" | "500" | "boundary";

const ICONS: Record<ErrorShellVariant, string> = {
  "404": "travel_explore",
  "403": "lock",
  "500": "error_outline",
  boundary: "warning",
};

const ACCENTS: Record<ErrorShellVariant, string> = {
  "404": "from-blue-500/20 via-violet-500/10 to-transparent",
  "403": "from-amber-500/25 via-orange-500/10 to-transparent",
  "500": "from-red-500/20 via-rose-500/10 to-transparent",
  boundary: "from-secondary/25 via-primary/5 to-transparent",
};

export interface ErrorShellContent {
  code?: string;
  title: string;
  headline: string;
  description: string;
  hints?: string[];
  detailsLabel?: string;
  digestLabel?: string;
}

export interface ErrorAction {
  href?: string;
  label: string;
  onClick?: () => void;
  primary?: boolean;
}

export function ErrorShellView({
  variant,
  content,
  actions,
  errorDigest,
  className,
  showThemeToggle = true,
}: {
  variant: ErrorShellVariant;
  content: ErrorShellContent;
  actions: ErrorAction[];
  errorDigest?: string;
  className?: string;
  /** Disable when rendered outside NextIntl (e.g. global-error). */
  showThemeToggle?: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "error-mesh-bg relative min-h-screen overflow-hidden px-4 py-10 sm:px-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute -left-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br blur-3xl",
            ACCENTS[variant],
          )}
        />
        <div className="from-secondary/15 absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center">
        <div className="mb-6 flex w-full items-center justify-between gap-4">
          <BrandLogo href="/" plainLink />
          {showThemeToggle ? <ThemeToggleGroup /> : <span className="h-8 w-8" aria-hidden />}
        </div>

        <div className="card-3d error-card-3d w-full rounded-[2rem] p-8 sm:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="error-icon-3d mb-6 flex h-24 w-24 items-center justify-center rounded-3xl">
              <span className="material-symbols-outlined text-secondary text-[48px]">
                {ICONS[variant]}
              </span>
            </div>

            {content.code ? (
              <p className="border-outline-variant/30 bg-surface-container-low font-geist text-label-sm text-on-surface-variant rounded-full border px-4 py-1 uppercase tracking-widest dark:border-white/10 dark:bg-white/5">
                {content.code}
              </p>
            ) : null}

            <h1 className="font-jakarta text-primary mt-4 text-3xl font-bold sm:text-4xl dark:text-white">
              {content.title}
            </h1>
            <p className="text-secondary mt-2 text-lg font-medium">{content.headline}</p>
            <p className="text-on-surface-variant mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              {content.description}
            </p>

            {content.hints && content.hints.length > 0 ? (
              <ul className="text-on-surface-variant mt-8 w-full max-w-lg space-y-3 text-left text-sm">
                {content.hints.map((hint) => (
                  <li
                    key={hint}
                    className="bg-surface-container-low/80 flex gap-3 rounded-xl px-4 py-3 dark:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-secondary mt-0.5 shrink-0 text-[18px]">
                      check_circle
                    </span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {actions.map((action, index) =>
                action.href ? (
                  <Link
                    key={`${action.href}-${index}`}
                    href={action.href}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition",
                      action.primary
                        ? "bg-primary text-on-primary dark:bg-secondary dark:text-on-secondary shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                        : "border-outline-variant/40 border bg-white/50 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white",
                    )}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={`action-${index}`}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition",
                      action.primary
                        ? "bg-primary text-on-primary shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                        : "border-outline-variant/40 border bg-white/50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white",
                    )}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>

            {errorDigest && content.detailsLabel ? (
              <details className="mt-8 w-full max-w-lg text-left">
                <summary className="text-on-surface-variant hover:text-primary cursor-pointer text-sm font-medium">
                  {content.detailsLabel}
                </summary>
                <pre className="bg-surface-container-low font-geist text-on-surface-variant mt-3 overflow-x-auto rounded-xl p-4 text-xs dark:bg-black/30">
                  {content.digestLabel ?? "Reference"}: {errorDigest}
                </pre>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
