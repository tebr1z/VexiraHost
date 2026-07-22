"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";

export interface TicketThreadMessage {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
  author?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

function formatAuthorName(author?: TicketThreadMessage["author"]): string | null {
  if (!author) return null;
  const fullName = [author.firstName, author.lastName].filter(Boolean).join(" ").trim();
  return fullName || author.email;
}

function getInitials(author?: TicketThreadMessage["author"]): string {
  const name = formatAuthorName(author);
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TicketMessageThread({
  messages,
  locale,
  viewer,
}: {
  messages: TicketThreadMessage[];
  locale: string;
  viewer: "customer" | "admin";
}): React.ReactElement {
  const tc = useTranslations("dashboard.common");
  const tt = useTranslations("dashboard.pages.tickets");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const resolveLabel = (msg: TicketThreadMessage): string => {
    const authorName = formatAuthorName(msg.author);

    if (viewer === "customer") {
      if (!msg.isStaff) return tc("you");
      return authorName ? `${tc("staff")} · ${authorName}` : tc("supportTeam");
    }

    if (msg.isStaff) {
      return authorName ? `${tc("staff")} · ${authorName}` : tc("staff");
    }

    return authorName ? `${tc("customer")} · ${authorName}` : tc("customer");
  };

  return (
    <div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-grouped)] p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--label-primary)]">{tt("conversation")}</h2>
      <div className="flex max-h-[min(70vh,640px)] flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((msg) => {
          const outgoing =
            viewer === "customer" ? !msg.isStaff : msg.isStaff;
          const label = resolveLabel(msg);

          return (
            <div
              key={msg.id}
              className={cn("flex items-end gap-2", outgoing ? "justify-end" : "justify-start")}
            >
              {!outgoing && (
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    msg.isStaff
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                  )}
                  aria-hidden
                >
                  {getInitials(msg.author)}
                </div>
              )}

              <div className={cn("flex max-w-[min(85%,420px)] flex-col gap-1", outgoing && "items-end")}>
                <p className="px-1 text-[11px] font-medium text-[var(--label-tertiary)]">{label}</p>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    outgoing
                      ? "rounded-br-md bg-[var(--accent)] text-white"
                      : "rounded-bl-md border border-[var(--separator)] bg-[var(--bg-elevated)] text-[var(--label-primary)]",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={cn(
                      "mt-1.5 text-[10px] tabular-nums",
                      outgoing ? "text-white/75" : "text-[var(--label-tertiary)]",
                    )}
                  >
                    {formatDate(msg.createdAt, locale)}
                  </p>
                </div>
              </div>

              {outgoing && (
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    msg.isStaff
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  )}
                  aria-hidden
                >
                  {getInitials(msg.author)}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
