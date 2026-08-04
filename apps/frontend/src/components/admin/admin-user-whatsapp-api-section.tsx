"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  getAdminWhatsappApiAccess,
  updateAdminWhatsappApiAccess,
  type WhatsappApiAccess,
} from "@/features/admin";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

export function AdminUserWhatsappApiSection({ userId }: { userId: string }): React.ReactElement {
  const t = useTranslations("admin.pages.users.whatsappApi");
  const [access, setAccess] = useState<WhatsappApiAccess | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminWhatsappApiAccess(userId)
      .then((value) => {
        setAccess(value);
        setEnabled(value.isEnabled);
        setMonthlyLimit(value.monthlyLimit);
      })
      .catch((error) => toast(getApiErrorMessage(error, t("loadFailed")), "error"));
  }, [t, userId]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateAdminWhatsappApiAccess(userId, {
        isEnabled: enabled,
        monthlyLimit: Math.max(0, Math.floor(monthlyLimit)),
      });
      setAccess(updated);
      toast(t("saved"), "success");
    } catch (error) {
      toast(getApiErrorMessage(error, t("saveFailed")), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{t("description")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={t("used")} value={String(access?.used ?? 0)} />
        <Metric label={t("remaining")} value={String(access?.remaining ?? 0)} />
        <Metric label={t("failed")} value={String(access?.failed ?? 0)} />
      </div>

      <label className="border-outline-variant/50 flex items-start gap-3 rounded-xl border p-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-medium">{t("enabled")}</span>
          <span className="text-on-surface-variant block text-sm">{t("enabledHelp")}</span>
        </span>
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("monthlyLimit")}</label>
        <input
          type="number"
          min={0}
          max={1_000_000}
          value={monthlyLimit}
          onChange={(event) => setMonthlyLimit(Number(event.target.value))}
          className="border-outline-variant h-11 w-full max-w-xs rounded-xl border px-4 text-sm"
        />
        <p className="text-on-surface-variant mt-1 text-xs">{t("monthlyLimitHelp")}</p>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="bg-primary text-on-primary h-10 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="border-outline-variant/50 bg-surface-container-low rounded-xl border p-4">
      <p className="text-on-surface-variant text-xs">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
