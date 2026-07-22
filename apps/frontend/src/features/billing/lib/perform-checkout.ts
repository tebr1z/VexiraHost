import type { CartItem } from "@/stores/cart-store";
import { resolveCheckoutPeriod } from "@/lib/cart-pricing";
import { usePricingStore } from "@/stores/pricing-store";

import { chargeInvoice, checkout, createPaymentMethod, listPaymentMethods } from "../services/billing.service";

const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

export interface BillingAddressInput {
  fullName: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export function validateCartDomains(
  items: CartItem[],
  messages: {
    domainRequired: (name: string) => string;
    domainInvalid: (name: string) => string;
  },
): void {
  for (const item of items.filter((i) => i.category === "HOSTING")) {
    if (!item.primaryDomain?.trim()) {
      throw new CheckoutValidationError(messages.domainRequired(item.name));
    }
    if (!DOMAIN_PATTERN.test(item.primaryDomain.trim())) {
      throw new CheckoutValidationError(messages.domainInvalid(item.name));
    }
  }
}

export function isCompleteBillingAddress(address: BillingAddressInput | null | undefined): boolean {
  if (!address) return false;
  return [
    address.fullName,
    address.line1,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ].every((value) => value.trim().length > 0);
}

export function validateBillingAddress(
  billingAddress: BillingAddressInput,
  message: string,
): BillingAddressInput {
  const normalized: BillingAddressInput = {
    fullName: billingAddress.fullName.trim(),
    line1: billingAddress.line1.trim(),
    city: billingAddress.city.trim(),
    region: billingAddress.region.trim(),
    postalCode: billingAddress.postalCode.trim(),
    country: billingAddress.country.trim(),
  };

  if (!isCompleteBillingAddress(normalized)) {
    throw new CheckoutValidationError(message);
  }

  return normalized;
}

export async function performCheckout(
  items: CartItem[],
  billingAddress: BillingAddressInput,
  billingAddressRequiredMessage: string,
): Promise<{
  orderId: string;
  hasHosting: boolean;
  redirectUrl?: string;
}> {
  const normalizedBillingAddress = validateBillingAddress(
    billingAddress,
    billingAddressRequiredMessage,
  );
  const pricing = usePricingStore.getState();
  const period = resolveCheckoutPeriod(items, pricing.period);
  const order = await checkout(
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      metadata: {
        ...(item.category === "HOSTING" && item.primaryDomain
          ? { primaryDomain: item.primaryDomain.trim().toLowerCase() }
          : {}),
        billingAddress: normalizedBillingAddress,
      },
    })),
    { currency: pricing.currency, period },
  );

  if (!order?.invoice?.id) {
    throw new Error("No invoice created");
  }

  let methods = await listPaymentMethods();
  if (methods.length === 0) {
    await createPaymentMethod();
    methods = await listPaymentMethods();
  }

  const payment = await chargeInvoice(order.invoice.id, methods[0]?.id);

  if (payment?.mode === "redirect" && payment.redirectUrl) {
    return {
      orderId: order.id,
      hasHosting: items.some((item) => item.category === "HOSTING"),
      redirectUrl: payment.redirectUrl,
    };
  }

  return {
    orderId: order.id,
    hasHosting: items.some((item) => item.category === "HOSTING"),
  };
}
