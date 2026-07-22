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
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 && <span className="text-on-surface-variant/50">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-secondary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-on-surface-variant" : "text-secondary"}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
