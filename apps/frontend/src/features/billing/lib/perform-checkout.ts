import {
  chargeInvoice,
  checkout,
  createPaymentMethod,
  listPaymentMethods,
} from "../services/billing.service";

import { resolveCheckoutPeriod } from "@/lib/cart-pricing";
import type { CartItem } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";

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

export type CheckoutPaymentMethod = "balance" | "card";

export async function performCheckout(
  items: CartItem[],
  billingAddress: BillingAddressInput | null | undefined,
  billingAddressRequiredMessage: string,
  options?: {
    requireBillingAddress?: boolean;
    promoCode?: string | null;
    paymentMethod?: CheckoutPaymentMethod;
  },
): Promise<{
  orderId: string;
  hasHosting: boolean;
  redirectUrl?: string;
}> {
  const requireBilling = options?.requireBillingAddress !== false;

  let normalizedBillingAddress: BillingAddressInput | null = null;
  if (requireBilling) {
    normalizedBillingAddress = validateBillingAddress(
      billingAddress ?? {
        fullName: "",
        line1: "",
        city: "",
        region: "",
        postalCode: "",
        country: "",
      },
      billingAddressRequiredMessage,
    );
  } else if (billingAddress && isCompleteBillingAddress(billingAddress)) {
    normalizedBillingAddress = {
      fullName: billingAddress.fullName.trim(),
      line1: billingAddress.line1.trim(),
      city: billingAddress.city.trim(),
      region: billingAddress.region.trim(),
      postalCode: billingAddress.postalCode.trim(),
      country: billingAddress.country.trim(),
    };
  }

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
        ...(normalizedBillingAddress ? { billingAddress: normalizedBillingAddress } : {}),
      },
    })),
    {
      currency: pricing.currency,
      period,
      promoCode: options?.promoCode?.trim() || undefined,
    },
  );

  if (!order?.invoice?.id) {
    throw new Error("No invoice created");
  }

  const invoiceTotal = Number(order.invoice.total ?? 0);
  const invoicePaid = order.invoice.status === "PAID";

  if (invoiceTotal <= 0 || invoicePaid) {
    return {
      orderId: order.id,
      hasHosting: items.some((item) => item.category === "HOSTING"),
    };
  }

  const paymentMethod = options?.paymentMethod ?? "card";

  if (paymentMethod === "balance") {
    const invoiceTotal = Number(order.invoice.total ?? 0);
    const payment = await chargeInvoice(order.invoice.id, {
      useBalance: true,
      amount: invoiceTotal,
    });

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

  let methods = await listPaymentMethods();
  if (methods.length === 0) {
    await createPaymentMethod();
    methods = await listPaymentMethods();
  }

  const payment = await chargeInvoice(order.invoice.id, { methodId: methods[0]?.id });

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
