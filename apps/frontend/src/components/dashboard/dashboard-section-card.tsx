import { cn } from "@/lib/cn";

export function DashboardSectionCard({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: string;
  icon?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section
      className={cn("dashboard-section-card relative overflow-hidden p-5 sm:p-6", className)}
    >
      {title || description || actions ? (
        <div className="relative z-10 mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="bg-[var(--accent)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--accent)]">
                <span className="material-symbols-outlined text-[21px]">{icon}</span>
              </span>
            ) : null}
            <div>
              {title ? (
                <h2 className="font-jakarta text-lg font-bold tracking-tight text-[var(--label-primary)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm leading-6 text-[var(--label-secondary)]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className="relative z-10">{children}</div>
      <div className="bg-[var(--accent)]/[0.035] pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full blur-2xl" />
    </section>
  );
}
