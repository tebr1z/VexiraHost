const STATUS_KEYS = [
  "ACTIVE",
  "PROVISIONING",
  "PENDING",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
  "ERROR",
  "PAID",
  "OPEN",
  "CLOSED",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "PROCESSING",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "RUNNING",
  "STOPPED",
  "TRANSFER_PENDING",
  "DRAFT",
  "VOID",
  "OVERDUE",
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

export function isKnownStatus(status: string): status is StatusKey {
  return STATUS_KEYS.includes(status.toUpperCase() as StatusKey);
}
