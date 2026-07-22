"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

import { usePublicNavigation } from "@/features/navigation/hooks/use-public-navigation";

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
          <div key={group.key} className="group relative">
            <button
              type="button"
              data-active={groupActive}
              className="apple-nav-link inline-flex items-center gap-1"
            >
              {group.label}
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-2 opacity-0 shadow-apple-md transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {group.items.map((item) =>
                item.href.startsWith("/#") ? (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={onNavigate}
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--label-secondary)] hover:bg-[var(--fill)] hover:text-[var(--label)]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onNavigate}
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--label-secondary)] hover:bg-[var(--fill)] hover:text-[var(--label)]"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
