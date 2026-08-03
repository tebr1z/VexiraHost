"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { creditAdminUserBalance, type AdminUser } from "@/features/admin";
import { toast } from "@/stores/toast-store";

export function AdminUserBalanceSection({
  user,
  onUpdated,
}: {
  user: AdminUser;
  onUpdated: (next: Pick<AdminUser, "accountBalance" | "balanceCurrency">) => void;
}): React.ReactElement {
  const tp = useTranslations("admin.pages.users.balance");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(user.balanceCurrency || "USD");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;

    setSaving(true);
    try {
      const result = await creditAdminUserBalance(user.id, {
        amount: value,
        currency,
        note: note.trim() || undefined,
      });
      onUpdated({ accountBalance: result.balance, balanceCurrency: result.currency });
      setAmount("");
      setNote("");
      toast(tp("credited"), "success");
    } catch {
      toast(tp("creditFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-outline-variant/40 mt-8 space-y-4 border-t pt-6">
      <div>
        <h3 className="text-on-surface text-base font-semibold">{tp("title")}</h3>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("description")}</p>
      </div>

      <p className="border-outline-variant/40 bg-surface-container-low/40 rounded-xl border px-4 py-3 text-sm">
        <span className="text-on-surface-variant">{tp("current")}: </span>
        <span className="text-on-surface font-semibold">
          {Number(user.accountBalance ?? 0).toFixed(2)} {user.balanceCurrency || "USD"}
        </span>
      </p>

      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={handleCredit}>
        <label className="block space-y-1 sm:col-span-1">
          <span className="text-on-surface-variant text-xs font-medium">{tp("amount")}</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-3 py-2 font-mono text-sm"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface-variant text-xs font-medium">{tp("currency")}</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-3 py-2 text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="TRY">TRY</option>
            <option value="AZN">AZN</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? tp("crediting") : tp("credit")}
          </button>
        </div>
        <label className="block space-y-1 sm:col-span-3">
          <span className="text-on-surface-variant text-xs font-medium">{tp("note")}</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tp("notePlaceholder")}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-3 py-2 text-sm"
          />
        </label>
      </form>
    </section>
  );
}
