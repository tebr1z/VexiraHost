export interface BankPaymentSession {
  paymentId: string;
  invoiceId: string;
  orderId?: string | null;
  url: string;
}
export type BankPaymentOutcome = "paid" | "closed" | "failed";
const BANK_HOSTS = new Set(["e-commerce.kapitalbank.az", "txpgtst.kapitalbank.az"]);
export function isKapitalPaymentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      BANK_HOSTS.has(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname === "/flex" &&
      /^\d+$/.test(url.searchParams.get("id") ?? "") &&
      Boolean(url.searchParams.get("password")) &&
      !url.hash
    );
  } catch {
    return false;
  }
}
export function isBankReturnMessage(
  event: { origin: string; source: unknown; data: unknown },
  origin: string,
  frame: unknown,
): boolean {
  return (
    Boolean(frame) &&
    event.origin === origin &&
    event.source === frame &&
    typeof event.data === "object" &&
    event.data !== null &&
    (event.data as { type?: unknown }).type === "vexira:bank-return"
  );
}
