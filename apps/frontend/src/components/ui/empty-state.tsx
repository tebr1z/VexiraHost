import { Link } from "@/i18n/navigation";

import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "card-3d rounded-2xl px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
        <span className="material-symbols-outlined text-[28px] text-primary">inbox</span>
      </div>
      <p className="font-semibold text-primary">{title}</p>
      {description && <p className="mt-2 text-sm text-on-surface-variant">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
