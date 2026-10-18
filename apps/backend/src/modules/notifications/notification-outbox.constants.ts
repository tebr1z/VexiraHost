export const NOTIFICATION_QUEUE_NAME = "vexira-notifications";

export const NotificationTemplate = {
  HOSTING_RENEWAL: "HOSTING_RENEWAL",
  RAW_EMAIL: "RAW_EMAIL",
  TEXT: "TEXT",
} as const;

export type NotificationTemplateName =
  (typeof NotificationTemplate)[keyof typeof NotificationTemplate];
