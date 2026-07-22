"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { AdminUser, UpdateAdminUserInput } from "@/features/admin";

const ROLES = ["customer", "staff", "admin"] as const;
const STATUSES = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"] as const;
const CURRENCIES = ["USD", "EUR", "AZN"] as const;
const PERIODS = ["MONTHLY", "YEARLY"] as const;

export function AdminUserForm({
  user,
  isSelf,
  submitLabel,
  onSubmit,
}: {
  user: AdminUser;
  isSelf?: boolean;
  submitLabel: string;
  onSubmit: (values: UpdateAdminUserInput) => Promise<void>;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const tu = useTranslations("admin.users");
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    role: user.role,
    status: user.status,
    preferredCurrency: user.preferredCurrency ?? "USD",
    billingPeriod: user.billingPeriod ?? "MONTHLY",
    currencyLocked: user.currencyLocked,
    emailVerified: user.emailVerified,
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: UpdateAdminUserInput = {
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        role: values.role,
        status: values.status,
        preferredCurrency: values.preferredCurrency,
        billingPeriod: values.billingPeriod,
        currencyLocked: values.currencyLocked,
        emailVerified: values.emailVerified,
      };
      if (values.password.trim()) {
        payload.password = values.password.trim();
      }
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="panel-card space-y-6 rounded-lg p-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">{tf("email")}</span>
          <input
            required
            type="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{tf("firstName")}</span>
          <input
            value={values.firstName}
            onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{tf("lastName")}</span>
          <input
            value={values.lastName}
            onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm"
          />
        </label>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{tf("role")}</span>
          <select
            value={values.role}
            disabled={isSelf}
            onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm capitalize disabled:opacity-60"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {tu(`roles.${role}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{tf("status")}</span>
          <select
            value={values.status}
            disabled={isSelf}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
            className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm disabled:opacity-60"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {tf(`userStatuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={values.emailVerified}
            onChange={(e) => setValues((v) => ({ ...v, emailVerified: e.target.checked }))}
            className="h-4 w-4 rounded border-outline-variant"
          />
          <span className="text-sm">{tf("emailVerified")}</span>
        </label>
      </section>

      <section className="border-t border-outline-variant/50 pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          {tf("billingPreferences")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{tf("preferredCurrency")}</span>
            <select
              value={values.preferredCurrency}
              onChange={(e) => setValues((v) => ({ ...v, preferredCurrency: e.target.value }))}
              className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{tf("billingPeriod")}</span>
            <select
              value={values.billingPeriod}
              onChange={(e) => setValues((v) => ({ ...v, billingPeriod: e.target.value }))}
              className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm"
            >
              {PERIODS.map((period) => (
                <option key={period} value={period}>
                  {tf(`billingPeriods.${period}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={values.currencyLocked}
              onChange={(e) => setValues((v) => ({ ...v, currencyLocked: e.target.checked }))}
              className="h-4 w-4 rounded border-outline-variant"
            />
            <span className="text-sm">{tf("currencyLocked")}</span>
          </label>
        </div>
      </section>

      <section className="border-t border-outline-variant/50 pt-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{tf("newPassword")}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            placeholder={tf("newPasswordHint")}
            className="h-11 w-full rounded-xl border border-outline-variant px-3 text-sm"
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/50 pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {saving ? tf("saving") : submitLabel}
        </button>
        {user.currencyChangedAt && (
          <p className="text-xs text-on-surface-variant">
            {tf("currencyChangedAt", {
              date: new Date(user.currencyChangedAt).toLocaleString(),
            })}
          </p>
        )}
      </div>
    </form>
  );
}
