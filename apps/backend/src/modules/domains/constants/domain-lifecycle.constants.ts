import type { DomainExpiryReminderKind } from "@prisma/client";

export const DOMAIN_GRACE_DAYS = 15;
export const DOMAIN_LATE_FEE_RATE = 0.01;

export const PRE_EXPIRY_REMINDER_DAYS = [30, 20, 15, 10, 5, 3, 2, 1] as const;
export const POST_EXPIRY_REMINDER_DAYS = [0, 7, 10, 15] as const;

export const PRE_EXPIRY_KIND: Record<
  (typeof PRE_EXPIRY_REMINDER_DAYS)[number],
  DomainExpiryReminderKind
> = {
  30: "PRE_30",
  20: "PRE_20",
  15: "PRE_15",
  10: "PRE_10",
  5: "PRE_5",
  3: "PRE_3",
  2: "PRE_2",
  1: "PRE_1",
};

export const POST_EXPIRY_KIND: Record<
  (typeof POST_EXPIRY_REMINDER_DAYS)[number],
  DomainExpiryReminderKind
> = {
  0: "EXPIRED",
  7: "EXPIRED_7",
  10: "EXPIRED_10",
  15: "EXPIRED_15",
};

export type DomainLifecycleReminderKind = DomainExpiryReminderKind;

export function utcDayDiff(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
