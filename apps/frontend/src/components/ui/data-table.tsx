"use client";

import { useMemo, useState } from "react";

import { LoadingSkeletonList } from "./loading-skeleton";

import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useNavigationProgressStore } from "@/stores/navigation-progress-store";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** When true, this cell stops row-click navigation (e.g. nested action buttons). */
  stopRowClick?: boolean;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found.",
  pageSize = 10,
  getRowKey,
  getRowHref,
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  getRowKey: (row: T) => string;
  /** Makes the entire row open this href (with chevron affordance). */
  getRowHref?: (row: T) => string | undefined;
  className?: string;
}): React.ReactElement {
  const router = useRouter();
  const startNav = useNavigationProgressStore((s) => s.start);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [columns, data, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) {
    return <LoadingSkeletonList rows={4} className={className} />;
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-10 text-center text-sm text-[var(--label-secondary)] shadow-sm",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--separator)] bg-[var(--fill-secondary)]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "font-geist px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--label-secondary)]",
                      col.sortable && "cursor-pointer select-none hover:text-[var(--accent)]",
                      col.className,
                    )}
                    onClick={() => toggleSort(col.key, col.sortable)}
                  >
                    {col.header}
                    {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : null}
                  </th>
                ))}
                {getRowHref ? <th className="w-12 px-3" aria-hidden /> : null}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row) => {
                const key = getRowKey(row);
                const href = getRowHref?.(row);
                const interactive = Boolean(href);

                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-[var(--separator)] transition-all duration-200 last:border-0",
                      interactive &&
                        "hover:bg-[var(--accent)]/[0.04] group cursor-pointer hover:shadow-[inset_3px_0_0_0_var(--accent)]",
                      pressedKey === key && "bg-[var(--accent)]/[0.08] scale-[0.998]",
                    )}
                    onClick={(event) => {
                      if (!href) return;
                      const target = event.target as HTMLElement | null;
                      if (target?.closest("a,button,[data-stop-row-click='true']")) return;
                      startNav();
                      router.push(href);
                    }}
                    onMouseDown={() => interactive && setPressedKey(key)}
                    onMouseUp={() => setPressedKey(null)}
                    onMouseLeave={() => setPressedKey(null)}
                    onKeyDown={(event) => {
                      if (!href) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        startNav();
                        router.push(href);
                      }
                    }}
                    tabIndex={interactive ? 0 : undefined}
                    role={interactive ? "link" : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-5 py-4", col.className)}
                        data-stop-row-click={col.stopRowClick ? "true" : undefined}
                        onClick={
                          col.stopRowClick
                            ? (event) => {
                                event.stopPropagation();
                              }
                            : undefined
                        }
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    {getRowHref ? (
                      <td className="px-3 py-4">
                        {href ? (
                          <Link
                            href={href}
                            className="group-hover:bg-[var(--accent)]/10 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--label-tertiary)] transition group-hover:text-[var(--accent)]"
                            aria-label="Open"
                            onClick={(event) => {
                              event.stopPropagation();
                              startNav();
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px] transition group-hover:translate-x-0.5">
                              chevron_right
                            </span>
                          </Link>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--label-secondary)]">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3.5 py-2 font-medium transition hover:bg-[var(--fill-secondary)] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3.5 py-2 font-medium transition hover:bg-[var(--fill-secondary)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
