"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { StatusBadge } from "@/components/ui";
import {
  assignUserManualHostingAccount,
  deleteUserManualHostingAccount,
  listUserManualHostingAccounts,
  updateUserManualHostingAccount,
  type AdminManualHostingAccount,
} from "@/features/admin";
import { formatDate } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

type ServiceCategory = "HOSTING" | "SERVER";
type PanelType = "PLESK" | "CPANEL";

export function AdminUserHostingSection({ userId }: { userId: string }): React.ReactElement {
  const locale = useLocale();
  const tp = useTranslations("admin.pages.users.hosting");
  const tc = useTranslations("dashboard.common");
  const [accounts, setAccounts] = useState<AdminManualHostingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "",
    serviceCategory: "HOSTING" as ServiceCategory,
    panel: "PLESK" as PanelType,
    panelIp: "",
    panelUrl: "",
    panelUsername: "",
    panelPassword: "",
    expiresAt: "",
    billingAmount: "",
    billingCurrency: "USD",
    createInvoiceNow: false,
  });

  const load = useCallback(() => {
    setLoading(true);
    listUserManualHostingAccounts(userId)
      .then(setAccounts)
      .catch(() => toast(tp("loadFailed"), "error"))
      .finally(() => setLoading(false));
  }, [userId, tp]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.label.trim() ||
      !form.panelIp.trim() ||
      !form.panelUsername.trim() ||
      !form.panelPassword
    ) {
      return;
    }

    setSaving(true);
    try {
      await assignUserManualHostingAccount(userId, {
        label: form.label.trim(),
        serviceCategory: form.serviceCategory,
        panel: form.panel,
        panelIp: form.panelIp.trim(),
        panelUrl: form.panelUrl.trim() || undefined,
        panelUsername: form.panelUsername.trim(),
        panelPassword: form.panelPassword,
        expiresAt: form.expiresAt || undefined,
        billingAmount: form.billingAmount ? Number(form.billingAmount) : undefined,
        billingCurrency: form.billingCurrency || "USD",
        createInvoiceNow: form.createInvoiceNow,
      });
      toast(form.createInvoiceNow ? tp("invoiceCreated") : tp("assigned"), "success");
      setForm({
        label: "",
        serviceCategory: "HOSTING",
        panel: "PLESK",
        panelIp: "",
        panelUrl: "",
        panelUsername: "",
        panelPassword: "",
        expiresAt: "",
        billingAmount: "",
        billingCurrency: "USD",
        createInvoiceNow: false,
      });
      setShowForm(false);
      load();
    } catch {
      toast(tp("assignFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = async (accountId: string, serviceCategory: ServiceCategory) => {
    setUpdatingId(accountId);
    try {
      const updated = await updateUserManualHostingAccount(userId, accountId, { serviceCategory });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      toast(tp("categoryUpdated"), "success");
    } catch {
      toast(tp("categoryUpdateFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePanelChange = async (accountId: string, panel: PanelType) => {
    setUpdatingId(accountId);
    try {
      const updated = await updateUserManualHostingAccount(userId, accountId, { panel });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      toast(tp("panelUpdated"), "success");
    } catch {
      toast(tp("panelUpdateFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePriceSave = async (accountId: string, amount: string, currency: string) => {
    setUpdatingId(accountId);
    try {
      const updated = await updateUserManualHostingAccount(userId, accountId, {
        billingAmount: amount === "" ? null : Number(amount),
        billingCurrency: currency || "USD",
      });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      toast(tp("priceUpdated"), "success");
    } catch {
      toast(tp("assignFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateInvoice = async (accountId: string) => {
    setUpdatingId(accountId);
    try {
      const updated = await updateUserManualHostingAccount(userId, accountId, {
        createInvoiceNow: true,
      });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, ...updated } : a)));
      toast(tp("invoiceCreated"), "success");
    } catch {
      toast(tp("assignFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (account: AdminManualHostingAccount) => {
    if (!confirm(tp("deleteConfirm", { name: account.primaryDomain }))) return;
    setUpdatingId(account.id);
    try {
      await deleteUserManualHostingAccount(userId, account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      if (editingId === account.id) setEditingId(null);
      toast(tp("deleted"), "success");
    } catch {
      toast(tp("deleteFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditSave = async (
    accountId: string,
    input: {
      panelIp: string;
      panelUrl: string;
      panelUsername: string;
      panelPassword: string;
      expiresAt: string;
    },
  ) => {
    if (!input.panelIp.trim() || !input.panelUsername.trim()) return;

    setUpdatingId(accountId);
    try {
      const updated = await updateUserManualHostingAccount(userId, accountId, {
        panelIp: input.panelIp.trim(),
        panelUrl: input.panelUrl.trim() || "",
        panelUsername: input.panelUsername.trim(),
        panelPassword: input.panelPassword || undefined,
        expiresAt: input.expiresAt || null,
      });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      setEditingId(null);
      toast(tp("updated"), "success");
    } catch {
      toast(tp("updateFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleClass = (active: boolean) =>
    [
      "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
      active
        ? "bg-primary text-on-primary shadow-sm"
        : "border border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-container-low",
    ].join(" ");

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-on-surface text-lg font-semibold">{tp("title")}</h2>
          <p className="text-on-surface-variant mt-1 text-sm">{tp("description")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-primary text-on-primary rounded-xl px-4 py-2 text-sm font-semibold"
        >
          {showForm ? tp("cancelAdd") : tp("addNew")}
        </button>
      </div>

      {showForm && (
        <form
          className="border-outline-variant/40 bg-surface-container-low/40 max-w-2xl space-y-4 rounded-2xl border p-5"
          onSubmit={handleAssign}
        >
          <div className="space-y-2">
            <span className="text-on-surface text-sm font-medium">{tp("serviceCategory")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={toggleClass(form.serviceCategory === "HOSTING")}
                onClick={() => setForm((c) => ({ ...c, serviceCategory: "HOSTING" }))}
              >
                {tc("categoryHosting")}
              </button>
              <button
                type="button"
                className={toggleClass(form.serviceCategory === "SERVER")}
                onClick={() => setForm((c) => ({ ...c, serviceCategory: "SERVER" }))}
              >
                {tc("categoryServer")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-on-surface text-sm font-medium">{tp("panelType")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={toggleClass(form.panel === "PLESK")}
                onClick={() => setForm((c) => ({ ...c, panel: "PLESK" }))}
              >
                Plesk
              </button>
              <button
                type="button"
                className={toggleClass(form.panel === "CPANEL")}
                onClick={() => setForm((c) => ({ ...c, panel: "CPANEL" }))}
              >
                cPanel
              </button>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("label")}</span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))}
              placeholder={tp("labelPlaceholder")}
              className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 text-sm"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("panelIp")}</span>
            <input
              type="text"
              value={form.panelIp}
              onChange={(e) => setForm((c) => ({ ...c, panelIp: e.target.value }))}
              placeholder="192.168.1.1"
              className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-on-surface text-sm font-medium">{tp("expiresAt")}</span>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))}
                className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-on-surface text-sm font-medium">{tp("billingAmount")}</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.billingAmount}
                  onChange={(e) => setForm((c) => ({ ...c, billingAmount: e.target.value }))}
                  placeholder="29.00"
                  className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
                />
                <select
                  value={form.billingCurrency}
                  onChange={(e) => setForm((c) => ({ ...c, billingCurrency: e.target.value }))}
                  className="border-outline-variant/40 bg-surface rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="TRY">TRY</option>
                  <option value="AZN">AZN</option>
                </select>
              </div>
            </label>
          </div>

          <label className="border-outline-variant/40 bg-surface flex items-start gap-3 rounded-xl border px-4 py-3">
            <input
              type="checkbox"
              checked={form.createInvoiceNow}
              onChange={(e) => setForm((c) => ({ ...c, createInvoiceNow: e.target.checked }))}
              className="mt-1"
            />
            <span>
              <span className="text-on-surface block text-sm font-medium">
                {tp("createInvoiceNow")}
              </span>
              <span className="text-on-surface-variant mt-0.5 block text-xs">
                {tp("createInvoiceHint")}
              </span>
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("panelUrl")}</span>
            <input
              type="url"
              value={form.panelUrl}
              onChange={(e) => setForm((c) => ({ ...c, panelUrl: e.target.value }))}
              placeholder={
                form.panel === "CPANEL" ? "https://203.0.113.10:2083" : tp("panelUrlPlaceholder")
              }
              className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
            />
            <p className="text-on-surface-variant text-xs">{tp("panelUrlHint")}</p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-on-surface text-sm font-medium">{tp("panelUsername")}</span>
              <input
                type="text"
                value={form.panelUsername}
                onChange={(e) => setForm((c) => ({ ...c, panelUsername: e.target.value }))}
                className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
                required
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-on-surface text-sm font-medium">{tp("panelPassword")}</span>
              <input
                type="password"
                value={form.panelPassword}
                onChange={(e) => setForm((c) => ({ ...c, panelPassword: e.target.value }))}
                className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
                required
                autoComplete="new-password"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? tp("assigning") : tp("assign")}
          </button>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-on-surface text-sm font-semibold">{tp("assignedList")}</h3>
        {loading ? (
          <p className="text-on-surface-variant text-sm">{tp("loading")}</p>
        ) : accounts.length === 0 ? (
          <p className="text-on-surface-variant text-sm">{tp("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="border-outline-variant/40 bg-surface rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-on-surface font-semibold">{account.primaryDomain}</p>
                    <p className="text-on-surface-variant mt-1 text-sm">
                      {account.panelIp ?? "—"} · {account.panelUsername ?? "—"}
                      {account.expiresAt
                        ? ` · ${tp("expires")}: ${formatDate(account.expiresAt, locale)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={account.status} />
                    <button
                      type="button"
                      disabled={updatingId === account.id}
                      onClick={() =>
                        setEditingId((current) => (current === account.id ? null : account.id))
                      }
                      className="border-outline-variant/40 bg-surface rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    >
                      {editingId === account.id ? tp("cancelEdit") : tp("edit")}
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === account.id}
                      onClick={() => void handleDelete(account)}
                      className="border-error/40 text-error hover:bg-error/10 rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    >
                      {tp("delete")}
                    </button>
                  </div>
                </div>

                {editingId === account.id ? (
                  <HostingEditPanel
                    account={account}
                    disabled={updatingId === account.id}
                    onCancel={() => setEditingId(null)}
                    onSave={(input) => void handleEditSave(account.id, input)}
                    labels={{
                      panelIp: tp("panelIp"),
                      panelUrl: tp("panelUrl"),
                      panelUrlHint: tp("panelUrlHint"),
                      panelUsername: tp("panelUsername"),
                      panelPassword: tp("panelPassword"),
                      panelPasswordHint: tp("panelPasswordHint"),
                      expiresAt: tp("expiresAt"),
                      save: tp("saveChanges"),
                      cancel: tp("cancelEdit"),
                    }}
                  />
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-on-surface-variant text-xs font-medium">
                      {tp("serviceCategory")}
                    </span>
                    <select
                      value={account.serviceCategory === "SERVER" ? "SERVER" : "HOSTING"}
                      disabled={updatingId === account.id}
                      onChange={(e) =>
                        void handleCategoryChange(account.id, e.target.value as ServiceCategory)
                      }
                      className="border-outline-variant/40 bg-surface w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="HOSTING">{tc("categoryHosting")}</option>
                      <option value="SERVER">{tc("categoryServer")}</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-on-surface-variant text-xs font-medium">
                      {tp("panelType")}
                    </span>
                    <select
                      value={account.panel === "CPANEL" ? "CPANEL" : "PLESK"}
                      disabled={updatingId === account.id}
                      onChange={(e) =>
                        void handlePanelChange(account.id, e.target.value as PanelType)
                      }
                      className="border-outline-variant/40 bg-surface w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="PLESK">Plesk</option>
                      <option value="CPANEL">cPanel</option>
                    </select>
                  </label>
                </div>

                <AccountBillingRow
                  account={account}
                  disabled={updatingId === account.id}
                  onSave={(amount, currency) => void handlePriceSave(account.id, amount, currency)}
                  onCreateInvoice={() => void handleCreateInvoice(account.id)}
                  labels={{
                    amount: tp("billingAmount"),
                    save: tp("savePrice"),
                    createInvoice: tp("createInvoiceAction"),
                    invoiceLinked: tp("invoiceLinked"),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function HostingEditPanel({
  account,
  disabled,
  onCancel,
  onSave,
  labels,
}: {
  account: AdminManualHostingAccount;
  disabled: boolean;
  onCancel: () => void;
  onSave: (input: {
    panelIp: string;
    panelUrl: string;
    panelUsername: string;
    panelPassword: string;
    expiresAt: string;
  }) => void;
  labels: {
    panelIp: string;
    panelUrl: string;
    panelUrlHint: string;
    panelUsername: string;
    panelPassword: string;
    panelPasswordHint: string;
    expiresAt: string;
    save: string;
    cancel: string;
  };
}): React.ReactElement {
  const [panelIp, setPanelIp] = useState(account.panelIp ?? "");
  const [panelUrl, setPanelUrl] = useState(account.panelUrl ?? "");
  const [panelUsername, setPanelUsername] = useState(account.panelUsername ?? "");
  const [panelPassword, setPanelPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState(toDateInput(account.expiresAt));

  useEffect(() => {
    setPanelIp(account.panelIp ?? "");
    setPanelUrl(account.panelUrl ?? "");
    setPanelUsername(account.panelUsername ?? "");
    setPanelPassword("");
    setExpiresAt(toDateInput(account.expiresAt));
  }, [account]);

  return (
    <div className="border-outline-variant/40 bg-surface-container-low/40 mt-4 space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{labels.panelIp}</span>
          <input
            type="text"
            value={panelIp}
            disabled={disabled}
            onChange={(e) => setPanelIp(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{labels.expiresAt}</span>
          <input
            type="date"
            value={expiresAt}
            disabled={disabled}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-on-surface text-sm font-medium">{labels.panelUrl}</span>
        <input
          type="url"
          value={panelUrl}
          disabled={disabled}
          onChange={(e) => setPanelUrl(e.target.value)}
          className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
        />
        <p className="text-on-surface-variant text-xs">{labels.panelUrlHint}</p>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{labels.panelUsername}</span>
          <input
            type="text"
            value={panelUsername}
            disabled={disabled}
            onChange={(e) => setPanelUsername(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
            autoComplete="off"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{labels.panelPassword}</span>
          <input
            type="password"
            value={panelPassword}
            disabled={disabled}
            onChange={(e) => setPanelPassword(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5 font-mono text-sm"
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <p className="text-on-surface-variant text-xs">{labels.panelPasswordHint}</p>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !panelIp.trim() || !panelUsername.trim()}
          onClick={() => onSave({ panelIp, panelUrl, panelUsername, panelPassword, expiresAt })}
          className="bg-primary text-on-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {labels.save}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="border-outline-variant/40 bg-surface rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}

function AccountBillingRow({
  account,
  disabled,
  onSave,
  onCreateInvoice,
  labels,
}: {
  account: AdminManualHostingAccount;
  disabled: boolean;
  onSave: (amount: string, currency: string) => void;
  onCreateInvoice: () => void;
  labels: {
    amount: string;
    save: string;
    createInvoice: string;
    invoiceLinked: string;
  };
}): React.ReactElement {
  const [amount, setAmount] = useState(
    account.billingAmount != null ? String(account.billingAmount) : "",
  );
  const [currency, setCurrency] = useState(account.billingCurrency || "USD");

  useEffect(() => {
    setAmount(account.billingAmount != null ? String(account.billingAmount) : "");
    setCurrency(account.billingCurrency || "USD");
  }, [account.billingAmount, account.billingCurrency, account.id]);

  return (
    <div className="border-outline-variant/30 bg-surface-container-low/40 mt-4 space-y-3 rounded-xl border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[8rem] flex-1 space-y-1">
          <span className="text-on-surface-variant text-xs font-medium">{labels.amount}</span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              disabled={disabled}
              onChange={(e) => setAmount(e.target.value)}
              className="border-outline-variant/40 bg-surface w-full rounded-xl border px-3 py-2 font-mono text-sm"
            />
            <select
              value={currency}
              disabled={disabled}
              onChange={(e) => setCurrency(e.target.value)}
              className="border-outline-variant/40 bg-surface rounded-xl border px-2 py-2 text-sm"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="TRY">TRY</option>
              <option value="AZN">AZN</option>
            </select>
          </div>
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(amount, currency)}
          className="border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-container-low rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {labels.save}
        </button>
        <button
          type="button"
          disabled={disabled || !(Number(amount) > 0)}
          onClick={onCreateInvoice}
          className="bg-primary text-on-primary rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {labels.createInvoice}
        </button>
      </div>
      {account.renewalInvoiceId ? (
        <p className="text-on-surface-variant text-xs">{labels.invoiceLinked}</p>
      ) : null}
    </div>
  );
}
