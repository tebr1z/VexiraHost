import { Injectable } from "@nestjs/common";

import type {
  PaymentChargeInput,
  PaymentChargeResult,
  PaymentProvider,
} from "../interfaces/payment-provider.interface";

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    if (input.amount <= 0) {
      return {
        success: false,
        gatewayRef: "",
        failureReason: "Invalid payment amount",
      };
    }

    const suffix = Math.floor(Math.random() * 900000 + 100000);
    return {
      success: true,
      gatewayRef: `mock_pay_${input.invoiceId.slice(-6)}_${suffix}`,
    };
  }
}
