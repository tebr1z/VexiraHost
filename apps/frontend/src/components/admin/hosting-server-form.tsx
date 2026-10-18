"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { getApiErrorMessage } from "@/lib/api-error";

export interface HostingServerFormValues {
  name: string;
  hostname: string;
  ipAddress: string;
  panel: "CPANEL" | "PLESK";
  whmUsername: string;
  whmPassword: string;
  apiToken: string;
  osVersion: string;
  sshUsername: string;
  sshPassword: string;
  sshPort: string;
  isDefault: boolean;
  isActive: boolean;
  deployNodeEnabled: boolean;
  maxAccounts: string;
}

const DEFAULT_VALUES: HostingServerFormValues = {
  name: "",
  hostname: "",
  ipAddress: "",
  panel: "PLESK",
  whmUsername: "admin",
  whmPassword: "",
  apiToken: "",
  osVersion: "",
  sshUsername: "",
  sshPassword: "",
  sshPort: "22",
  isDefault: false,
  isActive: true,
  deployNodeEnabled: false,
  maxAccounts: "",
};

export function HostingServerForm({
  initialValues,
  submitLabel,
  onSubmit,
  onTest,
  sshPasswordConfigured = false,
}: {
  initialValues?: Partial<HostingServerFormValues>;
  submitLabel: string;
  onSubmit: (values: HostingServerFormValues) => Promise<void>;
  onTest?: () => Promise<void>;
  sshPasswordConfigured?: boolean;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const tw = useTranslations("admin.forms.serverWorkflow");
  const [values, setValues] = useState<HostingServerFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const needsSsh = values.deployNodeEnabled && !initialValues?.deployNodeEnabled;

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
      setError(getApiErrorMessage(err, tf("saveFailed")));
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
    <form
      onSubmit={handleSubmit}
      className="border-outline-variant/50 bg-surface space-y-6 rounded-2xl border p-6"
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-on-surface text-sm font-semibold">{tf("serverGeneralSection")}</h2>
          <p className="text-on-surface-variant mt-1 text-xs">{tf("hostingServerDescription")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tf("serverName")}>
            <input
              value={values.name}
              minLength={2}
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
              placeholder="192.0.2.10"
            />
          </Field>
          <Field label={tf("hostname")}>
            <input
              value={values.hostname}
              minLength={3}
              onChange={(e) => update("hostname", e.target.value)}
              required
              className={inputClass}
              placeholder={tf("hostnamePlaceholder")}
            />
          </Field>
          <Field label={tf("panel")}>
            <select
              value={values.panel}
              onChange={(e) => {
                const panel = e.target.value as "CPANEL" | "PLESK";
                setValues((prev) => ({
                  ...prev,
                  panel,
                  whmUsername: ["root", "admin"].includes(prev.whmUsername)
                    ? panel === "PLESK"
                      ? "admin"
                      : "root"
                    : prev.whmUsername,
                }));
              }}
              className={inputClass}
            >
              <option value="CPANEL">cPanel / WHM</option>
              <option value="PLESK">Plesk</option>
            </select>
          </Field>
          <Field label={tf("osVersion")}>
            <input
              value={values.osVersion}
              onChange={(e) => update("osVersion", e.target.value)}
              className={inputClass}
              placeholder={tf("osVersionPlaceholder")}
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
      </section>

      <section className="border-outline-variant/40 space-y-4 border-t pt-6">
        <div>
          <h2 className="text-on-surface text-sm font-semibold">{tf("panelApiSection")}</h2>
          <p className="text-on-surface-variant mt-1 text-xs">{tf("panelApiSectionHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={values.panel === "PLESK" ? tf("pleskAdminUsername") : tf("whmUsername")}>
            <input
              value={values.whmUsername}
              onChange={(e) => update("whmUsername", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label={values.panel === "PLESK" ? tf("pleskAdminPassword") : tf("whmPassword")}>
            <input
              type="password"
              value={values.whmPassword}
              minLength={4}
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
        </div>
      </section>

      <section className="border-outline-variant/40 space-y-4 border-t pt-6">
        <div>
          <h2 className="text-on-surface text-sm font-semibold">{tf("deploySshSection")}</h2>
          <p className="text-on-surface-variant mt-1 text-xs">{tw("sshHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tf("sshUsername")}>
            <input
              value={values.sshUsername}
              onChange={(e) => update("sshUsername", e.target.value)}
              required={needsSsh}
              autoComplete="off"
              className={inputClass}
              placeholder={tf("sshUsernamePlaceholder")}
            />
          </Field>
          <Field label={tf("sshPassword")}>
            <input
              type="password"
              value={values.sshPassword}
              onChange={(e) => update("sshPassword", e.target.value)}
              required={needsSsh && !sshPasswordConfigured}
              minLength={4}
              autoComplete="new-password"
              className={inputClass}
              placeholder={
                sshPasswordConfigured ? tf("sshPasswordKeep") : tw("sshPasswordPlaceholder")
              }
            />
          </Field>
          <Field label={tf("sshPort")}>
            <input
              type="number"
              min={1}
              max={65535}
              value={values.sshPort}
              required={needsSsh}
              onChange={(e) => update("sshPort", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="border-primary/25 bg-primary/5 space-y-4 rounded-xl border p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="accent-primary mt-1 size-4"
            checked={values.deployNodeEnabled}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                deployNodeEnabled: e.target.checked,
              }))
            }
          />
          <span>
            <span className="text-on-surface block text-sm font-semibold">
              {tw("capabilityTitle")}
            </span>
            <span className="text-on-surface-variant mt-1 block text-sm">
              {tw("capabilityHint")}
            </span>
          </span>
        </label>
        {values.deployNodeEnabled ? (
          <div className="border-primary/15 border-t pt-4">
            <p className="text-on-surface-variant text-xs leading-relaxed">{tw("runtimeHint")}</p>
            <p className="text-primary mt-2 text-xs font-medium">{tw("setupHint")}</p>
          </div>
        ) : (
          <p className="text-on-surface-variant text-xs">{tw("hostingOnlyHint")}</p>
        )}
      </section>

      <div className="border-outline-variant/40 flex flex-wrap gap-4 border-t pt-4">
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

      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
      {testMessage && <p className="text-on-surface-variant text-sm">{testMessage}</p>}

      <div className="flex flex-wrap gap-3">
        {onTest && (
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="border-outline-variant hover:bg-surface-container-low h-11 rounded-xl border px-5 text-sm font-semibold disabled:opacity-60"
          >
            {testing ? tf("testing") : tf("testConnection")}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-on-primary h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
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
    deployNodeEnabled: values.deployNodeEnabled,
  };

  if (values.whmPassword.trim()) {
    payload.whmPassword = values.whmPassword;
  } else if (!isEdit) {
    payload.whmPassword = values.whmPassword;
  }

  if (values.apiToken.trim()) payload.apiToken = values.apiToken.trim();
  if (values.maxAccounts.trim()) payload.maxAccounts = Number(values.maxAccounts);
  if (values.osVersion.trim()) payload.osVersion = values.osVersion.trim();
  if (values.sshUsername.trim()) payload.sshUsername = values.sshUsername.trim();
  if (values.sshPassword.trim()) payload.sshPassword = values.sshPassword;
  if (values.sshPort.trim()) payload.sshPort = Number(values.sshPort);

  return payload;
}
