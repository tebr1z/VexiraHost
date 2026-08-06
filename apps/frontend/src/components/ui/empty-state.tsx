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
        "relative overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-6 py-14 text-center shadow-sm",
        className,
      )}
    >
      <div className="bg-[var(--accent)]/10 ring-[var(--accent)]/10 relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-[var(--accent)] shadow-inner ring-1">
        <span className="material-symbols-outlined text-[30px]">inbox</span>
      </div>
      <p className="relative z-10 text-lg font-semibold text-[var(--label-primary)]">{title}</p>
      {description && (
        <p className="relative z-10 mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--label-secondary)]">
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="shadow-[var(--accent)]/20 relative z-10 mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="shadow-[var(--accent)]/20 relative z-10 mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
      <div className="bg-[var(--accent)]/5 pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl" />
    </div>
  );
}
