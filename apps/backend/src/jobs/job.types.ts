/**
 * Background job definitions — architecture scaffold only.
 * Implement job processors when business logic is added.
 */
export enum JobName {
  SEND_EMAIL = "send-email",
  PROCESS_ORDER = "process-order",
  SYNC_SERVER = "sync-server",
  GENERATE_INVOICE = "generate-invoice",
  RUN_BACKUP = "run-backup",
}

export interface JobPayload {
  [JobName.SEND_EMAIL]: { to: string; template: string };
  [JobName.PROCESS_ORDER]: { orderId: string };
  [JobName.SYNC_SERVER]: { serverId: string };
  [JobName.GENERATE_INVOICE]: { invoiceId: string };
  [JobName.RUN_BACKUP]: { accountId: string };
}
