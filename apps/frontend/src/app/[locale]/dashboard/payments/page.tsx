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
    <div className="space-y-6">
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
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {adding ? "Adding..." : "Add mock card"}
          </button>
        }
      />

      {loading ? (
        <LoadingSkeletonList rows={2} />
      ) : methods.length === 0 ? (
        <EmptyState
          title={tp("empty")}
          actionLabel="Add mock card"
          onAction={addMockCard}
        />
      ) : (
        <ul className="space-y-3">
          {methods.map((m) => (
            <li
              key={m.id}
              className="card-3d flex items-center justify-between rounded-2xl border border-outline-variant/50 bg-surface p-4"
            >
              <div>
                <p className="font-semibold">{m.label}</p>
                <p className="text-sm text-on-surface-variant">
                  {m.type}
                  {m.last4 ? ` · **** ${m.last4}` : ""}
                  {m.isDefault ? " · Default" : ""}
                </p>
              </div>
              {m.brand && <span className="text-sm text-on-surface-variant">{m.brand}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
