import { apiClient } from "@/services/api-client";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  currency: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  order: { id: string; status: string } | null;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  payments?: {
    id: string;
    status: string;
    amount: number;
    gatewayRef: string | null;
    createdAt: string;
  }[];
}

export async function listInvoices(): Promise<Invoice[]> {
  const res = await apiClient.request<Invoice[]>("/billing/invoices");
  return res.data ?? [];
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const res = await apiClient.request<InvoiceDetail>(`/billing/invoices/${id}`);
  return res.data as InvoiceDetail;
}

export async function checkout(
  items: { productId: string; quantity: number; metadata?: Record<string, unknown> }[],
  options?: { currency?: string; period?: string; promoCode?: string },
) {
  const res = await apiClient.request<{
    id: string;
    invoice: { id: string; invoiceNumber: string; total: number; status?: string } | null;
  }>("/orders/checkout", {
    method: "POST",
    body: {
      items,
      currency: options?.currency,
      period: options?.period,
      promoCode: options?.promoCode,
    },
  });
  return res.data;
}

export type PromoValidateResult = {
  valid: boolean;
  discountAmount: number;
  code: string | null;
  messageKey: string;
  messageParams: Record<string, string | number>;
};

export async function validatePromoCode(input: {
  code: string;
  items: { productId: string; quantity: number }[];
  currency?: string;
  period?: string;
}): Promise<PromoValidateResult> {
  const res = await apiClient.request<PromoValidateResult>("/orders/promo/validate", {
    method: "POST",
    body: input,
  });
  return res.data as PromoValidateResult;
}

export async function chargeInvoice(
  invoiceId: string,
  options?: { methodId?: string; useBalance?: boolean; amount?: number },
) {
  const res = await apiClient.request<{
    mode?: "completed" | "redirect";
    id: string;
    status: string;
    amount?: number;
    redirectUrl?: string;
    orderId?: string | null;
    invoiceId?: string;
    paidWithBalance?: boolean;
    invoiceFullyPaid?: boolean;
    amountDue?: number;
    remainingBalance?: number;
    balanceCurrency?: string;
  }>("/payments/charge", {
    method: "POST",
    body: {
      invoiceId,
      methodId: options?.methodId,
      useBalance: options?.useBalance,
      amount: options?.amount,
    },
  });
  return res.data;
}

export async function getAccountBalance(): Promise<{ balance: number; currency: string }> {
  const res = await apiClient.request<{ balance: number; currency: string }>("/payments/balance");
  return res.data as { balance: number; currency: string };
}

export async function createPaymentMethod() {
  const res = await apiClient.request<{ id: string }>("/payments/methods", {
    method: "POST",
    body: {
      type: "CARD",
      label: "Visa •••• 4242",
      last4: "4242",
      brand: "Visa",
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: true,
    },
  });
  return res.data as { id: string };
}

export async function listPaymentMethods(): Promise<
  {
    id: string;
    type: string;
    label: string;
    last4: string | null;
    brand: string | null;
    isDefault: boolean;
  }[]
> {
  const res = await apiClient.request<
    {
      id: string;
      type: string;
      label: string;
      last4: string | null;
      brand: string | null;
      isDefault: boolean;
    }[]
  >("/payments/methods");
  return res.data ?? [];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function downloadInvoicePdf(
  invoiceId: string,
  accessToken: string,
  locale?: string,
): Promise<void> {
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const response = await fetch(`${API_BASE_URL}/billing/invoices/${invoiceId}/pdf${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to download invoice PDF");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const fileName = match?.[1] ?? `invoice-${invoiceId}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
