"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  disablePaymentMethod,
  getAccountBalance,
  listPaymentMethods,
  registerEpointCard,
  setDefaultPaymentMethod,
  type PaymentMethod,
} from "@/features/billing";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

interface Balance {
  balance: number;
  currency: string;
}

export default function PaymentsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.payments");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    try {
      setMethods(await listPaymentMethods());
    } catch (error) {
      toast(getApiErrorMessage(error, tp("loadFailed")), "error");
    }
  }, [tp]);

  useEffect(() => {
    void getAccountBalance()
      .then(setBalance)
      .catch(() => setBalance(null));
    void loadMethods();

    const cardResult = new URLSearchParams(window.location.search).get("card");
    if (cardResult === "success") toast(tp("cardAdded"), "success");
    if (cardResult === "failed") toast(tp("cardAddFailed"), "error");
  }, [loadMethods, tp]);

  const addCard = async () => {
    setBusy("add");
    try {
      const result = await registerEpointCard();
      window.location.assign(result.redirectUrl);
    } catch (error) {
      toast(getApiErrorMessage(error, tp("cardAddFailed")), "error");
      setBusy(null);
    }
  };

  const makeDefault = async (id: string) => {
    setBusy(id);
    try {
      await setDefaultPaymentMethod(id);
      await loadMethods();
      toast(tp("defaultUpdated"), "success");
    } catch (error) {
      toast(getApiErrorMessage(error, tp("updateFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await disablePaymentMethod(id);
      await loadMethods();
      toast(tp("cardRemoved"), "success");
    } catch (error) {
      toast(getApiErrorMessage(error, tp("updateFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.payments") },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-6 shadow-sm">
          <span className="bg-[var(--accent)]/10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--accent)]">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </span>
          <h2 className="font-jakarta text-lg font-semibold text-[var(--label-primary)]">
            {tp("balanceTitle")}
          </h2>
          <p className="mt-2 text-sm text-[var(--label-secondary)]">{tp("balanceDescription")}</p>
          <p className="mt-5 text-2xl font-bold tabular-nums text-[var(--label-primary)]">
            {balance ? `${balance.balance.toFixed(2)} ${balance.currency}` : "—"}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-6 shadow-sm">
          <span className="bg-[var(--accent)]/10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--accent)]">
            <span className="material-symbols-outlined">credit_card</span>
          </span>
          <h2 className="font-jakarta text-lg font-semibold text-[var(--label-primary)]">
            {tp("cardTitle")}
          </h2>
          <p className="mt-2 text-sm text-[var(--label-secondary)]">{tp("cardDescription")}</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void addCard()}
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "add" ? tp("openingEpoint") : tp("addCard")}
          </button>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-jakarta text-lg font-semibold text-[var(--label-primary)]">
              {tp("savedCards")}
            </h2>
            <p className="mt-1 text-sm text-[var(--label-secondary)]">{tp("savedCardsHint")}</p>
          </div>
          <span className="rounded-full bg-[var(--fill-secondary)] px-3 py-1 text-xs font-semibold text-[var(--label-secondary)]">
            {tp("cardSecurity")}
          </span>
        </div>

        {methods.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[var(--fill-secondary)] p-4 text-sm text-[var(--label-secondary)]">
            {tp("noCards")}
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--separator)] p-4"
              >
                <div>
                  <p className="font-semibold text-[var(--label-primary)]">{method.label}</p>
                  <p className="mt-1 text-xs text-[var(--label-secondary)]">
                    {method.status === "ACTIVE"
                      ? tp("active")
                      : method.status === "FAILED"
                        ? tp("failed")
                        : tp("pending")}
                    {method.isDefault ? ` · ${tp("default")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {method.status === "ACTIVE" && !method.isDefault ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void makeDefault(method.id)}
                      className="rounded-lg border border-[var(--separator)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      {tp("makeDefault")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void remove(method.id)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    {tp("remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
