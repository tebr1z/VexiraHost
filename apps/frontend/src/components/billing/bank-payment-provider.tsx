"use client";
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  isKapitalPaymentUrl,
  type BankPaymentOutcome,
  type BankPaymentSession,
} from "@/lib/bank-payment";
const BankPaymentDialog = lazy(() =>
  import("./bank-payment-dialog").then((module) => ({ default: module.BankPaymentDialog })),
);
const Context = createContext<
  ((session: BankPaymentSession) => Promise<BankPaymentOutcome>) | null
>(null);
export function BankPaymentProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BankPaymentSession | null>(null);
  const resolver = useRef<((outcome: BankPaymentOutcome) => void) | null>(null);
  const finish = useCallback((outcome: BankPaymentOutcome) => {
    const resolve = resolver.current;
    resolver.current = null;
    setSession(null);
    resolve?.(outcome);
  }, []);
  const open = useCallback((value: BankPaymentSession) => {
    if (!isKapitalPaymentUrl(value.url) || !value.paymentId || !value.invoiceId)
      return Promise.reject(new Error("Invalid bank payment session"));
    if (resolver.current) return Promise.reject(new Error("A bank payment is already open"));
    return new Promise<BankPaymentOutcome>((resolve) => {
      resolver.current = resolve;
      setSession(value);
    });
  }, []);
  useEffect(
    () => () => {
      resolver.current?.("closed");
      resolver.current = null;
    },
    [],
  );
  return (
    <Context.Provider value={open}>
      {children}
      {session && (
        <Suspense fallback={null}>
          <BankPaymentDialog session={session} onFinish={finish} />
        </Suspense>
      )}
    </Context.Provider>
  );
}
export function useBankPayment() {
  const value = useContext(Context);
  if (!value) throw new Error("BankPaymentProvider is missing");
  return value;
}
