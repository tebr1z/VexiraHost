"use client";

import { Link } from "@/i18n/navigation";

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
}: {
  variant: ErrorShellVariant;
  content: ErrorShellContent;
  actions: ErrorAction[];
  errorDigest?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("error-mesh-bg relative min-h-screen overflow-hidden px-4 py-10 sm:px-6", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={cn("absolute -left-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br blur-3xl", ACCENTS[variant])} />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-secondary/15 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center">
        <div className="mb-6 flex w-full items-center justify-between gap-4">
          <BrandLogo href="/" />
          <ThemeToggleGroup />
        </div>

        <div className="card-3d error-card-3d w-full rounded-[2rem] p-8 sm:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="error-icon-3d mb-6 flex h-24 w-24 items-center justify-center rounded-3xl">
              <span className="material-symbols-outlined text-[48px] text-secondary">{ICONS[variant]}</span>
            </div>

            {content.code && (
              <p className="rounded-full border border-outline-variant/30 bg-surface-container-low px-4 py-1 font-geist text-label-sm uppercase tracking-widest text-on-surface-variant dark:border-white/10 dark:bg-white/5">
                {content.code}
              </p>
            )}

            <h1 className="mt-4 font-jakarta text-3xl font-bold text-primary dark:text-white sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-2 text-lg font-medium text-secondary">{content.headline}</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
              {content.description}
            </p>

            {content.hints && content.hints.length > 0 && (
              <ul className="mt-8 w-full max-w-lg space-y-3 text-left text-sm text-on-surface-variant">
                {content.hints.map((hint) => (
                  <li key={hint} className="flex gap-3 rounded-xl bg-surface-container-low/80 px-4 py-3 dark:bg-white/5">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-secondary">check_circle</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {actions.map((action, index) =>
                action.href ? (
                  <Link
                    key={`${action.href}-${index}`}
                    href={action.href}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition",
                      action.primary
                        ? "bg-primary text-on-primary shadow-lg hover:-translate-y-0.5 hover:shadow-xl dark:bg-secondary dark:text-on-secondary"
                        : "border border-outline-variant/40 bg-white/50 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white",
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
                        : "border border-outline-variant/40 bg-white/50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white",
                    )}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>

            {errorDigest && content.detailsLabel && (
              <details className="mt-8 w-full max-w-lg text-left">
                <summary className="cursor-pointer text-sm font-medium text-on-surface-variant hover:text-primary">
                  {content.detailsLabel}
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-container-low p-4 font-geist text-xs text-on-surface-variant dark:bg-black/30">
                  {content.digestLabel ?? "Reference"}: {errorDigest}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
