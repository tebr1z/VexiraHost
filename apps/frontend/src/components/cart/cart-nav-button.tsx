"use client";

import { useLocale } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";
import { Link } from "@/i18n/navigation";
import { isStaffRole } from "@/lib/is-staff-role";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useMaintenanceStore } from "@/stores/maintenance-store";

const CART_LABEL: Record<string, string> = {
  az: "Səbət",
  en: "Cart",
  tr: "Sepet",
  ru: "Корзина",
};

export function CartNavButton({
  className = "",
}: {
  className?: string;
}): React.ReactElement | null {
  const locale = useLocale();
  const cartCount = useCartStore((s) => s.items.length);
  const cartBlocked = useMaintenanceStore((s) => s.access.sections.cart.blocked);
  const role = useAuthStore((s) => s.user?.role);
  if (cartBlocked && !isStaffRole(role)) return null;
  const label = CART_LABEL[locale] ?? CART_LABEL.en!;

  return (
    <Link
      href="/cart"
      aria-label={label}
      title={label}
      className={`relative inline-flex h-9 w-9 items-center justify-center text-[var(--label-secondary)] transition hover:text-[var(--label)] ${className}`}
    >
      <MaterialIcon name="shopping_cart" />
      {cartCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
