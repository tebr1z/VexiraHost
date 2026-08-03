import { Decimal } from "@prisma/client/runtime/library";

export type PromoMessageKey =
  | "applied"
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "currency_mismatch"
  | "min_order"
  | "not_applicable"
  | "limit_total"
  | "limit_user";

export type PromoLineItem = {
  productId: string;
  category: string;
  totalPrice: Decimal;
};

export type PromoCodeLike = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: Decimal | number;
  currency: string | null;
  maxDiscountAmount: Decimal | number | null;
  minOrderAmount: Decimal | number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  appliesToAll: boolean;
  productIds: string[];
  categories: string[];
};

export type PromoEvalResult =
  | {
      valid: true;
      discountAmount: Decimal;
      messageKey: "applied";
      messageParams: Record<string, string | number>;
      promo: PromoCodeLike;
    }
  | {
      valid: false;
      discountAmount: Decimal;
      messageKey: Exclude<PromoMessageKey, "applied">;
      messageParams: Record<string, string | number>;
      promo: PromoCodeLike | null;
    };

function roundMoney(value: Decimal): Decimal {
  return new Decimal(value.toFixed(2));
}

function isLineEligible(promo: PromoCodeLike, line: PromoLineItem): boolean {
  if (promo.appliesToAll) return true;
  if (promo.productIds.includes(line.productId)) return true;
  if (promo.categories.includes(line.category)) return true;
  return false;
}

/** Discount that would apply on the given eligible/order totals (no min-order check). */
function calcDiscountForEligible(
  promo: PromoCodeLike,
  eligibleSubtotal: Decimal,
  orderSubtotal: Decimal,
): Decimal {
  const value = new Decimal(promo.value);
  let discount: Decimal;
  if (promo.type === "PERCENT") {
    discount = eligibleSubtotal.mul(value).div(100);
    if (promo.maxDiscountAmount != null) {
      discount = Decimal.min(discount, new Decimal(promo.maxDiscountAmount));
    }
  } else {
    discount = Decimal.min(value, eligibleSubtotal);
  }
  discount = Decimal.min(discount, orderSubtotal);
  return roundMoney(discount);
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function computePromoDiscount(
  promo: PromoCodeLike,
  lines: PromoLineItem[],
  orderSubtotal: Decimal,
  cartCurrency: string,
  opts: {
    now?: Date;
    totalRedemptions?: number;
    userRedemptions?: number;
  } = {},
): PromoEvalResult {
  const now = opts.now ?? new Date();
  const zero = new Decimal(0);

  if (!promo.isActive) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "inactive",
      messageParams: { code: promo.code },
      promo,
    };
  }

  if (promo.startsAt && now < promo.startsAt) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "not_started",
      messageParams: {
        code: promo.code,
        startsAt: promo.startsAt.toISOString(),
      },
      promo,
    };
  }

  if (promo.endsAt && now > promo.endsAt) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "expired",
      messageParams: {
        code: promo.code,
        endsAt: promo.endsAt.toISOString(),
      },
      promo,
    };
  }

  const needsCurrency =
    promo.type === "FIXED" || promo.maxDiscountAmount != null || promo.minOrderAmount != null;

  if (needsCurrency && promo.currency && promo.currency !== cartCurrency) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "currency_mismatch",
      messageParams: {
        code: promo.code,
        currency: promo.currency,
        cartCurrency,
      },
      promo,
    };
  }

  if (promo.maxRedemptions != null && (opts.totalRedemptions ?? 0) >= promo.maxRedemptions) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "limit_total",
      messageParams: { code: promo.code },
      promo,
    };
  }

  if (promo.maxPerUser != null && (opts.userRedemptions ?? 0) >= promo.maxPerUser) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "limit_user",
      messageParams: { code: promo.code },
      promo,
    };
  }

  if (promo.minOrderAmount != null && orderSubtotal.lt(promo.minOrderAmount)) {
    const min = new Decimal(promo.minOrderAmount);
    const remaining = roundMoney(min.sub(orderSubtotal));
    const progress = Math.min(
      100,
      Math.max(0, Math.round(Number(orderSubtotal.div(min).mul(100).toFixed(0)))),
    );
    // Target unlock amount: FIXED = code value; PERCENT = percent of min order.
    let potentialDiscount: Decimal;
    if (promo.type === "PERCENT") {
      potentialDiscount = calcDiscountForEligible(promo, min, min);
    } else {
      potentialDiscount = roundMoney(Decimal.min(new Decimal(promo.value), min));
    }

    return {
      valid: false,
      discountAmount: zero,
      messageKey: "min_order",
      messageParams: {
        code: promo.code,
        minOrderAmount: Number(promo.minOrderAmount),
        currency: cartCurrency,
        currentSubtotal: Number(roundMoney(orderSubtotal)),
        remainingAmount: Number(remaining),
        potentialDiscount: Number(potentialDiscount),
        progressPercent: progress,
        type: promo.type,
        value: Number(promo.value),
      },
      promo,
    };
  }

  const eligible = lines.filter((line) => isLineEligible(promo, line));
  const eligibleSubtotal = eligible.reduce((sum, line) => sum.add(line.totalPrice), new Decimal(0));

  if (eligibleSubtotal.lte(0)) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "not_applicable",
      messageParams: { code: promo.code },
      promo,
    };
  }

  const discount = calcDiscountForEligible(promo, eligibleSubtotal, orderSubtotal);

  if (discount.lte(0)) {
    return {
      valid: false,
      discountAmount: zero,
      messageKey: "not_applicable",
      messageParams: { code: promo.code },
      promo,
    };
  }

  return {
    valid: true,
    discountAmount: discount,
    messageKey: "applied",
    messageParams: {
      code: promo.code,
      discountAmount: Number(discount),
      currency: cartCurrency,
      type: promo.type,
      value: Number(promo.value),
      maxDiscountAmount: promo.maxDiscountAmount != null ? Number(promo.maxDiscountAmount) : "",
    },
    promo,
  };
}
