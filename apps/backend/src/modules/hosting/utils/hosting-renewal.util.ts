import { BillingCycle } from "@prisma/client";

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Advance a paid hosting period without overflowing month-end dates. */
export function calculateHostingExpiry(from: Date, cycle: BillingCycle): Date | null {
  if (cycle === BillingCycle.ONE_TIME) return null;

  const next = new Date(from);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);

  if (cycle === BillingCycle.YEARLY) {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    const months = cycle === BillingCycle.QUARTERLY ? 3 : cycle === BillingCycle.SEMIANNUAL ? 6 : 1;
    next.setUTCMonth(next.getUTCMonth() + months);
  }

  next.setUTCDate(Math.min(originalDay, daysInUtcMonth(next.getUTCFullYear(), next.getUTCMonth())));
  return next;
}
