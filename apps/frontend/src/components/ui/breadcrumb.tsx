import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}): React.ReactElement {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium shadow-sm",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && (
              <span className="material-symbols-outlined text-[14px] text-[var(--label-tertiary)]">
                chevron_right
              </span>
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded-md px-1 py-0.5 text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--accent)]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "rounded-md px-1 py-0.5",
                  isLast ? "font-semibold text-[var(--accent)]" : "text-[var(--label-secondary)]",
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
