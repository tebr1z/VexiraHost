"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export interface HostingServerFormValues {
  name: string;
  hostname: string;
  ipAddress: string;
  panel: "CPANEL" | "PLESK";
  whmUsername: string;
  whmPassword: string;
  apiToken: string;
  isDefault: boolean;
  isActive: boolean;
  maxAccounts: string;
}

const DEFAULT_VALUES: HostingServerFormValues = {
  name: "",
  hostname: "",
  ipAddress: "",
  panel: "CPANEL",
  whmUsername: "root",
  whmPassword: "",
  apiToken: "",
  isDefault: false,
  isActive: true,
  maxAccounts: "",
};

export function HostingServerForm({
  initialValues,
  submitLabel,
  onSubmit,
  onTest,
}: {
  initialValues?: Partial<HostingServerFormValues>;
  submitLabel: string;
  onSubmit: (values: HostingServerFormValues) => Promise<void>;
  onTest?: () => Promise<void>;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const [values, setValues] = useState<HostingServerFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const update = (key: keyof HostingServerFormValues, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tf("saveFailed");
      setError(msg ?? tf("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestMessage(null);
    try {
      await onTest();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tf("connectionTestFailed");
      setTestMessage(msg ?? tf("connectionTestFailed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-outline-variant/50 bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tf("serverName")}>
          <input
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className={inputClass}
            placeholder={tf("serverNamePlaceholder")}
          />
        </Field>
        <Field label={tf("ipAddress")}>
          <input
            value={values.ipAddress}
            onChange={(e) => update("ipAddress", e.target.value)}
            required
            className={inputClass}
            placeholder={tf("ipPlaceholder")}
          />
        </Field>
        <Field label={tf("hostname")}>
          <input
            value={values.hostname}
            onChange={(e) => update("hostname", e.target.value)}
            required
            className={inputClass}
            placeholder={tf("hostnamePlaceholder")}
          />
        </Field>
        <Field label={tf("panel")}>
          <select
            value={values.panel}
            onChange={(e) => update("panel", e.target.value as "CPANEL" | "PLESK")}
            className={inputClass}
          >
            <option value="CPANEL">cPanel / WHM</option>
            <option value="PLESK">Plesk</option>
          </select>
        </Field>
        <Field label={tf("whmUsername")}>
          <input
            value={values.whmUsername}
            onChange={(e) => update("whmUsername", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label={tf("whmPassword")}>
          <input
            type="password"
            value={values.whmPassword}
            onChange={(e) => update("whmPassword", e.target.value)}
            required={!initialValues}
            className={inputClass}
            placeholder={initialValues ? tf("whmPasswordKeep") : ""}
          />
        </Field>
        <Field label={tf("apiTokenOptional")}>
          <input
            value={values.apiToken}
            onChange={(e) => update("apiToken", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={tf("maxAccountsOptional")}>
          <input
            type="number"
            min={1}
            value={values.maxAccounts}
            onChange={(e) => update("maxAccounts", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => update("isDefault", e.target.checked)}
          />
          {tf("defaultServer")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
          />
          {tf("active")}
        </label>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {testMessage && <p className="text-sm text-on-surface-variant">{testMessage}</p>}

      <div className="flex flex-wrap gap-3">
        {onTest && (
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="h-11 rounded-xl border border-outline-variant px-5 text-sm font-semibold hover:bg-surface-container-low disabled:opacity-60"
          >
            {testing ? tf("testing") : tf("testConnection")}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {loading ? tf("saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-geist text-label-sm text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm";

export function toServerPayload(values: HostingServerFormValues, isEdit = false) {
  const payload: Record<string, unknown> = {
    name: values.name.trim(),
    hostname: values.hostname.trim(),
    ipAddress: values.ipAddress.trim(),
    panel: values.panel,
    whmUsername: values.whmUsername.trim(),
    isDefault: values.isDefault,
    isActive: values.isActive,
  };

  if (values.whmPassword.trim()) {
    payload.whmPassword = values.whmPassword;
  } else if (!isEdit) {
    payload.whmPassword = values.whmPassword;
  }

  if (values.apiToken.trim()) payload.apiToken = values.apiToken.trim();
  if (values.maxAccounts.trim()) payload.maxAccounts = Number(values.maxAccounts);

  return payload;
}
