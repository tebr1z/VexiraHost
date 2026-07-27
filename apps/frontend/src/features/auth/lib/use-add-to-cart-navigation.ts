"use client";

import { stashAuthNext } from "@/features/auth/lib/auth-redirect";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

/** After adding to cart: guests go to login (cart stays in localStorage), then return to /cart. */
export function useAddToCartNavigation(): (opts?: { cartPath?: string }) => void {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (opts) => {
    const cartPath = opts?.cartPath ?? "/cart";
    if (!isAuthenticated) {
      stashAuthNext(cartPath);
      router.push(`/login?next=${encodeURIComponent(cartPath)}`);
      return;
    }
    router.push(cartPath);
  };
}
