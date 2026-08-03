"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/features/notifications";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/i18n/format";

export function NotificationBell(): React.ReactElement {
  const t = useTranslations("dashboard.notifications");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listNotifications();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore transient errors in the bell
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void listNotifications()
        .then((data) => {
          setItems(data.items);
          setUnreadCount(data.unreadCount);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const handleItemClick = async (item: AppNotification) => {
    if (item.unread) {
      try {
        const count = await markNotificationRead(item.id);
        setUnreadCount(count);
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, unread: false, readAt: new Date().toISOString() } : row,
          ),
        );
      } catch {
        // keep UI usable
      }
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    try {
      const count = await markAllNotificationsRead();
      setUnreadCount(count);
      setItems((prev) =>
        prev.map((row) => ({
          ...row,
          unread: false,
          readAt: row.readAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      // ignore
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--label-secondary)] transition hover:bg-[var(--fill-secondary)] hover:text-[var(--label)]"
        aria-label={t("ariaLabel")}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--separator)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--label)]">{t("title")}</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {t("markAllRead")}
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--label-secondary)]">
                {t("loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--label-secondary)]">
                {t("empty")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--separator)]">
                {items.map((item) => {
                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm text-[var(--label)]",
                            item.unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.title}
                        </p>
                        {item.unread ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--label-secondary)]">
                        {item.body}
                      </p>
                      <p className="mt-1.5 text-[11px] text-[var(--label-tertiary)]">
                        {formatDateTime(item.createdAt, locale)}
                        {item.reference ? ` · ${item.reference}` : ""}
                      </p>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => void handleItemClick(item)}
                          className={cn(
                            "block px-3 py-3 transition hover:bg-[var(--fill-secondary)]",
                            item.unread && "bg-[var(--accent)]/5",
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleItemClick(item)}
                          className={cn(
                            "block w-full px-3 py-3 text-left transition hover:bg-[var(--fill-secondary)]",
                            item.unread && "bg-[var(--accent)]/5",
                          )}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
