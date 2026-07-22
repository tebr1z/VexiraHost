import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppCurrency = "USD" | "EUR" | "AZN";
export type AppPeriod = "MONTHLY" | "YEARLY";

interface PricingState {
  currency: AppCurrency;
  period: AppPeriod;
  countryCode: string | null;
  currencyLocked: boolean;
  hydrated: boolean;
  setCurrency: (currency: AppCurrency) => void;
  setPeriod: (period: AppPeriod) => void;
  setFromGeo: (input: { currency: AppCurrency; countryCode: string | null }) => void;
  setFromUser: (input: {
    preferredCurrency?: string | null;
    billingPeriod?: string | null;
    currencyLocked?: boolean;
  }) => void;
  setHydrated: (value: boolean) => void;
}

const STORAGE_KEY = "vexira-pricing";

function parseCurrency(value?: string | null): AppCurrency {
  const upper = value?.toUpperCase();
  if (upper === "EUR" || upper === "AZN" || upper === "USD") return upper;
  return "USD";
}

function parsePeriod(value?: string | null): AppPeriod {
  return value?.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export const usePricingStore = create<PricingState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      period: "MONTHLY",
      countryCode: null,
      currencyLocked: false,
      hydrated: false,
      setCurrency: (currency) => {
        if (get().currencyLocked || get().countryCode === "AZ") {
          set({ currency: "AZN" });
          return;
        }
        set({ currency });
      },
      setPeriod: (period) => set({ period }),
      setFromGeo: ({ currency, countryCode }) => {
        const locked = countryCode === "AZ";
        set({
          currency: locked ? "AZN" : currency,
          countryCode,
          currencyLocked: locked || get().currencyLocked,
        });
      },
      setFromUser: ({ preferredCurrency, billingPeriod, currencyLocked }) => {
        set({
          currency: parseCurrency(preferredCurrency),
          period: parsePeriod(billingPeriod),
          currencyLocked: Boolean(currencyLocked),
        });
      },
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        currency: state.currency,
        period: state.period,
        countryCode: state.countryCode,
        currencyLocked: state.currencyLocked,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export async function detectGeoCurrency(): Promise<{
  currency: AppCurrency;
  countryCode: string | null;
}> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  try {
    const res = await fetch(`${base}/geo/currency`);
    const body = (await res.json()) as {
      data?: { currency?: string; countryCode?: string | null };
    };
    return {
      currency: parseCurrency(body.data?.currency),
      countryCode: body.data?.countryCode ?? null,
    };
  } catch {
    return { currency: "USD", countryCode: null };
  }
}
