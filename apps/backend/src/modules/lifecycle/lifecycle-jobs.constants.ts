export const LIFECYCLE_QUEUE_NAME = "vexira-lifecycle";

export const LifecycleJob = {
  INVOICE_REMINDER: "lifecycle.invoice-reminder",
  HOSTING_EXPIRY: "lifecycle.hosting-expiry",
  DOMAIN_EXPIRY: "lifecycle.domain-expiry",
  ADDON_EXPIRY: "lifecycle.addon-expiry",
  SERVER_EXPIRY: "lifecycle.server-expiry",
} as const;

export type LifecycleJobName = (typeof LifecycleJob)[keyof typeof LifecycleJob];
