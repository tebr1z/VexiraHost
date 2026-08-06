"use client";

import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backHref,
  backLabel,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  /** Explicit back target. If omitted, uses the previous breadcrumb with an href. */
  backHref?: string;
  backLabel?: string;
  className?: string;
}): React.ReactElement {
  const crumbs = breadcrumbs ?? [];
  const crumbBack = [...crumbs].reverse().find((item) => item.href);
  const resolvedBackHref = backHref ?? crumbBack?.href;
  const resolvedBackLabel = backLabel ?? crumbBack?.label;
  const currentCrumb = crumbs.length > 0 ? crumbs[crumbs.length - 1] : null;
  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
  const showLocationChip = Boolean(parentCrumb && currentCrumb && crumbs.length >= 3);

  return (
    <header className={cn("dashboard-page-header space-y-4 pb-1", className)}>
      {crumbs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {resolvedBackHref ? (
            <Link
              href={resolvedBackHref}
              className="dashboard-back-link hover:border-[var(--accent)]/30 group inline-flex items-center gap-1.5 rounded-full border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--label-secondary)] shadow-sm transition hover:-translate-x-0.5 hover:text-[var(--accent)]"
            >
              <span className="material-symbols-outlined text-[16px] transition group-hover:-translate-x-0.5">
                arrow_back
              </span>
              {resolvedBackLabel}
            </Link>
          ) : null}
          <Breadcrumb items={crumbs} />
        </div>
      ) : null}

      {showLocationChip && parentCrumb && currentCrumb ? (
        <div className="dashboard-location-chip border-[var(--accent)]/15 bg-[var(--accent)]/[0.06] inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm">
          <span className="bg-[var(--accent)]/12 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[var(--accent)]">
            <span className="material-symbols-outlined text-[16px]">near_me</span>
          </span>
          <span className="min-w-0 truncate text-[var(--label-secondary)]">
            <span className="font-medium text-[var(--label-primary)]">{parentCrumb.label}</span>
            <span className="mx-1.5 text-[var(--label-tertiary)]">/</span>
            <span className="font-semibold text-[var(--accent)]">{currentCrumb.label}</span>
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-jakarta text-2xl font-bold tracking-tight text-[var(--label-primary)] sm:text-3xl">
            {title}
          </h1>
          <div className="mt-2 h-1 w-10 rounded-full bg-gradient-to-r from-[var(--accent)] to-violet-500" />
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--label-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
