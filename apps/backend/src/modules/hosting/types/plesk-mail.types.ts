export interface PleskMailbox {
  id: string | null;
  /** Local part before @ */
  name: string;
  /** Full email address */
  address: string;
  quotaBytes: number | null;
  usedBytes: number | null;
  enabled: boolean;
  forwarding: string | null;
  autoresponder: boolean;
  webmailUrl?: string;
}

export interface PleskMailSummary {
  domain: string;
  webmailHost?: string;
  webmailUrl?: string;
  count: number;
  maxMailboxes: number | null;
  mailboxes: PleskMailbox[];
}
