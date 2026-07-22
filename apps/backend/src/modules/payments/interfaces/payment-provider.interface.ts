export interface PaymentChargeInput {
  amount: number;
  currency: string;
  invoiceId: string;
  methodId?: string;
}

export interface PaymentChargeResult {
  success: boolean;
  gatewayRef: string;
  failureReason?: string;
}

/** Immediate charge (mock) or HPP redirect (Kapital). */
export interface PaymentCheckoutResult {
  mode: "completed" | "redirect";
  gatewayRef?: string;
  redirectUrl?: string;
  failureReason?: string;
}

export interface PaymentProvider {
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
}
