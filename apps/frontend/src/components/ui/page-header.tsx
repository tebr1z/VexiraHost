import { cn } from "@/lib/cn";

import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("space-y-3 pb-1", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-jakarta text-2xl font-semibold text-primary">{title}</h1>
          {description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
