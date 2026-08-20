export type StaffAlertKind =
  "TICKET_OPENED" | "TICKET_REPLY" | "ORDER_PLACED" | "DNS_CHANGED" | "CONTACT_FORM";

export interface StaffAlertPayload {
  kind: StaffAlertKind;
  title: string;
  lines: string[];
  url?: string;
}

function clip(value: string, max = 220): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatStaffAlertMessage(payload: StaffAlertPayload): string {
  const body = payload.lines
    .filter(Boolean)
    .map((line) => `• ${clip(line)}`)
    .join("\n");
  const link = payload.url ? `\n\n${payload.url}` : "";
  return `Vexira Host\n${payload.title}\n\n${body}${link}`;
}
