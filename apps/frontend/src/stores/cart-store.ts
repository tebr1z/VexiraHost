import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  category?: string;
  hostingPlanSlug?: string | null;
  quantity: number;
  primaryDomain?: string;
  yearlyPrice?: number;
  yearlySavingsPercent?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "primaryDomain">) => void;
  removeItem: (productId: string) => void;
  setPrimaryDomain: (productId: string, primaryDomain: string) => void;
  updateItemBilling: (productId: string, billingCycle: string, price: number) => void;
  patchItem: (productId: string, patch: Partial<CartItem>) => void;
  clearCart: () => void;
  total: () => number;
  hasHosting: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        });
      },
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      setPrimaryDomain: (productId, primaryDomain) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, primaryDomain: primaryDomain.trim().toLowerCase() } : i,
          ),
        })),
      updateItemBilling: (productId, billingCycle, price) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  billingCycle,
                  price,
                  ...(billingCycle.toUpperCase() === "YEARLY"
                    ? { yearlyPrice: undefined, yearlySavingsPercent: undefined }
                    : {}),
                }
              : i,
          ),
        })),
      patchItem: (productId, patch) =>
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, ...patch } : i)),
        })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      hasHosting: () => get().items.some((i) => i.category === "HOSTING"),
    }),
    { name: "vexira-cart" },
  ),
);
