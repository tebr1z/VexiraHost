"use client";

import { usePublicNavigation } from "@/features/navigation/hooks/use-public-navigation";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }): React.ReactElement {
  const pathname = usePathname();
  const groups = usePublicNavigation();

  return (
    <>
      {groups.map((group) => {
        const groupActive = group.items.some((item) =>
          item.pathMatch ? pathname.startsWith(item.pathMatch) : false,
        );

        return (
          <div key={group.key} className="group/nav relative">
            <button
              type="button"
              data-active={groupActive}
              aria-haspopup="menu"
              className="apple-nav-link public-nav-trigger inline-flex items-center gap-1.5"
            >
              <span>{group.label}</span>
              <span
                className="material-symbols-outlined public-nav-chevron text-[17px]"
                aria-hidden
              >
                expand_more
              </span>
            </button>
            <div
              role="menu"
              className="public-nav-dropdown invisible absolute left-1/2 top-full z-50 w-[20rem] -translate-x-1/2 translate-y-1.5 opacity-0 transition-all duration-150 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100"
            >
              <div className="border-b border-[var(--separator)] px-3.5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--label-tertiary)]">
                  {group.label}
                </p>
              </div>
              <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-1.5">
                {group.items.map((item) => {
                  const active = item.pathMatch ? pathname.startsWith(item.pathMatch) : false;
                  const itemClass = cn(
                    "public-nav-dropdown-item group/item flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[var(--fill)] text-[var(--label)]"
                      : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]",
                  );
                  const content = (
                    <>
                      <span>{item.label}</span>
                      <span className="material-symbols-outlined text-[16px] text-[var(--label-tertiary)] transition-transform group-hover/item:translate-x-0.5">
                        arrow_forward
                      </span>
                    </>
                  );

                  return item.href.startsWith("/#") ? (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={onNavigate}
                      className={itemClass}
                      role="menuitem"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onNavigate}
                      className={itemClass}
                      role="menuitem"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
