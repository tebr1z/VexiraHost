"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { EmptyState, LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { createPaymentMethod, listPaymentMethods } from "@/features/billing";

interface Method {
  id: string;
  type: string;
  label: string;
  last4: string | null;
  brand: string | null;
  isDefault: boolean;
}

export default function PaymentsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.payments");
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () =>
    listPaymentMethods()
      .then(setMethods)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const addMockCard = async () => {
    setAdding(true);
    try {
      await createPaymentMethod();
      await load();
    } finally {
      setAdding(false);
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
        actions={
          <button
            type="button"
            onClick={addMockCard}
            disabled={adding}
            className="dashboard-btn-primary disabled:opacity-60"
          >
            {adding ? "Adding..." : "Add mock card"}
          </button>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={2} />
      ) : methods.length === 0 ? (
        <EmptyState title={tp("empty")} actionLabel="Add mock card" onAction={addMockCard} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {methods.map((m) => (
            <li
              key={m.id}
              className="hover:border-[var(--accent)]/20 group flex min-h-28 items-center justify-between rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="bg-[var(--accent)]/10 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--accent)]">
                  <span className="material-symbols-outlined">credit_card</span>
                </span>
                <div>
                  <p className="font-semibold text-[var(--label-primary)]">{m.label}</p>
                  <p className="text-sm text-[var(--label-secondary)]">
                    {m.type}
                    {m.last4 ? ` · **** ${m.last4}` : ""}
                    {m.isDefault ? " · Default" : ""}
                  </p>
                </div>
              </div>
              {m.brand && (
                <span className="rounded-full bg-[var(--fill-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--label-secondary)]">
                  {m.brand}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
