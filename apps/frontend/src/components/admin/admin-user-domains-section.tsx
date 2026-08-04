"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_NAMESERVERS,
  DomainNameserversEditor,
} from "@/components/domains/domain-nameservers-editor";
import {
  DEFAULT_NS_GLUE,
  DomainNsGlueEditor,
  validateGlueEntries,
  type NsGlueEntry,
} from "@/components/domains/domain-ns-glue-editor";
import { StatusBadge } from "@/components/ui";
import {
  assignUserManualDomain,
  deleteUserManualDomain,
  listUserManualDomains,
  updateUserManualDomain,
  type AdminManualDomain,
} from "@/features/admin";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

const REGISTRAR_SOURCES = ["natro", "hostinger", "other"] as const;

export function AdminUserDomainsSection({ userId }: { userId: string }): React.ReactElement {
  const locale = useLocale();
  const tp = useTranslations("admin.pages.users.domains");
  const [domains, setDomains] = useState<AdminManualDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignPanel, setAssignPanel] = useState<"nameservers" | "glue">("nameservers");
  const [form, setForm] = useState({
    name: "",
    expiresAt: "",
    registrarSource: "natro",
    nameservers: [...DEFAULT_NAMESERVERS],
    nsGlueEntries: [...DEFAULT_NS_GLUE] as NsGlueEntry[],
    billingAmount: "",
    billingCurrency: "USD",
    createInvoiceNow: false,
  });

  const load = useCallback(() => {
    setLoading(true);
    listUserManualDomains(userId)
      .then(setDomains)
      .catch(() => toast(tp("loadFailed"), "error"))
      .finally(() => setLoading(false));
  }, [userId, tp]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const nsGlueEntries = form.nsGlueEntries
      .map((entry) => ({
        host: entry.host.trim().toLowerCase(),
        ip: entry.ip.trim(),
      }))
      .filter((entry) => entry.host.length > 0);

    const nameservers = form.nameservers.map((ns) => ns.trim().toLowerCase()).filter(Boolean);

    const ipError = validateGlueEntries(nsGlueEntries, tp("ipInvalidFormat"));
    if (ipError) {
      toast(ipError, "error");
      return;
    }

    if (nsGlueEntries.length < 2) {
      toast(tp("glueHostsMin"), "error");
      return;
    }

    if (nameservers.length < 2) {
      toast(tp("nameserversMin"), "error");
      return;
    }

    setSaving(true);
    try {
      await assignUserManualDomain(userId, {
        name: form.name.trim(),
        expiresAt: form.expiresAt || undefined,
        registrarSource: form.registrarSource,
        nameservers,
        nsGlueEntries,
        billingAmount: form.billingAmount ? Number(form.billingAmount) : undefined,
        billingCurrency: form.billingCurrency || "USD",
        createInvoiceNow: form.createInvoiceNow,
      });
      toast(form.createInvoiceNow ? tp("invoiceCreated") : tp("assigned"), "success");
      setForm({
        name: "",
        expiresAt: "",
        registrarSource: "natro",
        nameservers: [...DEFAULT_NAMESERVERS],
        nsGlueEntries: [...DEFAULT_NS_GLUE],
        billingAmount: "",
        billingCurrency: "USD",
        createInvoiceNow: false,
      });
      load();
    } catch {
      toast(tp("assignFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePriceSave = async (domainId: string, amount: string, currency: string) => {
    setUpdatingId(domainId);
    try {
      const updated = await updateUserManualDomain(userId, domainId, {
        billingAmount: amount === "" ? null : Number(amount),
        billingCurrency: currency || "USD",
      });
      setDomains((prev) => prev.map((d) => (d.id === domainId ? updated : d)));
      toast(tp("priceUpdated"), "success");
    } catch {
      toast(tp("assignFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateInvoice = async (domainId: string) => {
    setUpdatingId(domainId);
    try {
      const updated = await updateUserManualDomain(userId, domainId, {
        createInvoiceNow: true,
      });
      setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, ...updated } : d)));
      toast(tp("invoiceCreated"), "success");
    } catch {
      toast(tp("assignFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (domain: AdminManualDomain) => {
    if (!confirm(tp("deleteConfirm", { name: domain.name }))) return;
    setUpdatingId(domain.id);
    try {
      await deleteUserManualDomain(userId, domain.id);
      setDomains((prev) => prev.filter((d) => d.id !== domain.id));
      if (editingId === domain.id) setEditingId(null);
      toast(tp("deleted"), "success");
    } catch {
      toast(tp("deleteFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditSave = async (
    domainId: string,
    input: {
      expiresAt: string;
      registrarSource: string;
      nameservers: string[];
      nsGlueEntries: NsGlueEntry[];
    },
  ) => {
    const nsGlueEntries = input.nsGlueEntries
      .map((entry) => ({
        host: entry.host.trim().toLowerCase(),
        ip: entry.ip.trim(),
      }))
      .filter((entry) => entry.host.length > 0);
    const nameservers = input.nameservers.map((ns) => ns.trim().toLowerCase()).filter(Boolean);

    const ipError = validateGlueEntries(nsGlueEntries, tp("ipInvalidFormat"));
    if (ipError) {
      toast(ipError, "error");
      return;
    }
    if (nsGlueEntries.length < 2) {
      toast(tp("glueHostsMin"), "error");
      return;
    }
    if (nameservers.length < 2) {
      toast(tp("nameserversMin"), "error");
      return;
    }

    setUpdatingId(domainId);
    try {
      const updated = await updateUserManualDomain(userId, domainId, {
        expiresAt: input.expiresAt || null,
        registrarSource: input.registrarSource,
        nameservers,
        nsGlueEntries,
      });
      setDomains((prev) => prev.map((d) => (d.id === domainId ? updated : d)));
      setEditingId(null);
      toast(tp("updated"), "success");
    } catch {
      toast(tp("updateFailed"), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const panelButtonClass = (panel: "nameservers" | "glue") =>
    [
      "w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
      assignPanel === panel
        ? "bg-primary text-on-primary shadow-sm"
        : "border border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-container-low",
    ].join(" ");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-on-surface text-lg font-semibold">{tp("title")}</h2>
          <p className="text-on-surface-variant mt-1 text-sm">{tp("description")}</p>
        </div>
        <Link
          href="/t4abriz/panel/domains/changes"
          className="border-outline-variant hover:bg-surface-container-low rounded-xl border px-4 py-2 text-sm font-semibold"
        >
          {tp("viewChanges")}
        </Link>
      </div>

      <form className="max-w-2xl space-y-8" onSubmit={handleAssign}>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("domainName")}</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            placeholder="ornek.com"
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
            <span className="text-on-surface text-sm font-medium">{tp("registrarSource")}</span>
            <select
              value={form.registrarSource}
              onChange={(e) => setForm((c) => ({ ...c, registrarSource: e.target.value }))}
              className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5"
            >
              {REGISTRAR_SOURCES.map((key) => (
                <option key={key} value={key}>
                  {tp(`registrarOptions.${key}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("billingAmount")}</span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.billingAmount}
                onChange={(e) => setForm((c) => ({ ...c, billingAmount: e.target.value }))}
                placeholder="12.00"
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
          <label className="border-outline-variant/40 bg-surface flex items-start gap-3 self-end rounded-xl border px-4 py-3">
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
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="lg:w-56 lg:shrink-0">
            <p className="text-on-surface-variant mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
              {tp("settingsNavLabel")}
            </p>
            <nav className="flex flex-row gap-2 lg:flex-col">
              <button
                type="button"
                className={panelButtonClass("nameservers")}
                onClick={() => setAssignPanel("nameservers")}
              >
                {tp("settingsTabNs")}
              </button>
              <button
                type="button"
                className={panelButtonClass("glue")}
                onClick={() => setAssignPanel("glue")}
              >
                {tp("settingsTabGlue")}
              </button>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            {assignPanel === "nameservers" ? (
              <DomainNameserversEditor
                nameservers={form.nameservers}
                onChange={(nameservers) => setForm((c) => ({ ...c, nameservers }))}
                translationScope="admin"
              />
            ) : (
              <DomainNsGlueEditor
                entries={form.nsGlueEntries}
                onChange={(nsGlueEntries) => setForm((c) => ({ ...c, nsGlueEntries }))}
                translationScope="admin"
                onValidationError={(msg) => {
                  if (msg) toast(msg, "error");
                }}
              />
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? tp("assigning") : tp("assign")}
        </button>
      </form>

      {loading ? (
        <p className="text-on-surface-variant text-sm">{tp("loading")}</p>
      ) : domains.length === 0 ? (
        <p className="text-on-surface-variant text-sm">{tp("empty")}</p>
      ) : (
        <ul className="divide-outline-variant/30 border-outline-variant/40 divide-y rounded-xl border">
          {domains.map((domain) => (
            <li key={domain.id} className="space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-on-surface font-semibold">{domain.name}</p>
                  {domain.expiresAt ? (
                    <p className="text-on-surface-variant mt-1 text-xs">
                      {tp("expires")}: {formatDate(domain.expiresAt, locale)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={domain.status} />
                  {domain.pendingChangeCount > 0 && (
                    <Link
                      href="/t4abriz/panel/domains/changes?status=PENDING"
                      className="text-secondary text-xs font-semibold hover:underline"
                    >
                      {tp("pendingChanges", { count: domain.pendingChangeCount })}
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={updatingId === domain.id}
                    onClick={() =>
                      setEditingId((current) => (current === domain.id ? null : domain.id))
                    }
                    className="border-outline-variant/40 bg-surface rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {editingId === domain.id ? tp("cancelEdit") : tp("edit")}
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === domain.id}
                    onClick={() => void handleDelete(domain)}
                    className="border-error/40 text-error hover:bg-error/10 rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {tp("delete")}
                  </button>
                </div>
              </div>
              {editingId === domain.id ? (
                <DomainEditPanel
                  domain={domain}
                  disabled={updatingId === domain.id}
                  onCancel={() => setEditingId(null)}
                  onSave={(input) => void handleEditSave(domain.id, input)}
                  labels={{
                    expiresAt: tp("expiresAt"),
                    registrarSource: tp("registrarSource"),
                    settingsNavLabel: tp("settingsNavLabel"),
                    settingsTabNs: tp("settingsTabNs"),
                    settingsTabGlue: tp("settingsTabGlue"),
                    save: tp("saveChanges"),
                    cancel: tp("cancelEdit"),
                    registrarOptions: {
                      natro: tp("registrarOptions.natro"),
                      hostinger: tp("registrarOptions.hostinger"),
                      other: tp("registrarOptions.other"),
                    },
                  }}
                />
              ) : (
                <>
                  {domain.nameservers.length > 0 && (
                    <p className="text-on-surface-variant font-mono text-xs">
                      NS: {domain.nameservers.join(" · ")}
                    </p>
                  )}
                  {domain.nsGlueRecords.length > 0 && (
                    <p className="text-on-surface-variant font-mono text-xs">
                      {domain.nsGlueRecords
                        .map((entry) => `${entry.host} → ${entry.ip || "—"}`)
                        .join(" · ")}
                    </p>
                  )}
                </>
              )}
              <DomainBillingRow
                domain={domain}
                disabled={updatingId === domain.id}
                onSave={(amount, currency) => void handlePriceSave(domain.id, amount, currency)}
                onCreateInvoice={() => void handleCreateInvoice(domain.id)}
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
    </section>
  );
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function DomainEditPanel({
  domain,
  disabled,
  onCancel,
  onSave,
  labels,
}: {
  domain: AdminManualDomain;
  disabled: boolean;
  onCancel: () => void;
  onSave: (input: {
    expiresAt: string;
    registrarSource: string;
    nameservers: string[];
    nsGlueEntries: NsGlueEntry[];
  }) => void;
  labels: {
    expiresAt: string;
    registrarSource: string;
    settingsNavLabel: string;
    settingsTabNs: string;
    settingsTabGlue: string;
    save: string;
    cancel: string;
    registrarOptions: { natro: string; hostinger: string; other: string };
  };
}): React.ReactElement {
  const [panel, setPanel] = useState<"nameservers" | "glue">("nameservers");
  const [expiresAt, setExpiresAt] = useState(toDateInput(domain.expiresAt));
  const [registrarSource, setRegistrarSource] = useState(domain.registrarSource || "natro");
  const [nameservers, setNameservers] = useState(
    domain.nameservers.length >= 2 ? [...domain.nameservers] : [...DEFAULT_NAMESERVERS],
  );
  const [nsGlueEntries, setNsGlueEntries] = useState<NsGlueEntry[]>(
    domain.nsGlueRecords.length >= 2
      ? domain.nsGlueRecords.map((e) => ({ host: e.host, ip: e.ip || "" }))
      : [...DEFAULT_NS_GLUE],
  );

  useEffect(() => {
    setExpiresAt(toDateInput(domain.expiresAt));
    setRegistrarSource(domain.registrarSource || "natro");
    setNameservers(
      domain.nameservers.length >= 2 ? [...domain.nameservers] : [...DEFAULT_NAMESERVERS],
    );
    setNsGlueEntries(
      domain.nsGlueRecords.length >= 2
        ? domain.nsGlueRecords.map((e) => ({ host: e.host, ip: e.ip || "" }))
        : [...DEFAULT_NS_GLUE],
    );
  }, [domain]);

  const tabClass = (active: boolean) =>
    [
      "w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
      active
        ? "bg-primary text-on-primary shadow-sm"
        : "border border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-container-low",
    ].join(" ");

  return (
    <div className="border-outline-variant/40 bg-surface-container-low/40 space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{labels.registrarSource}</span>
          <select
            value={registrarSource}
            disabled={disabled}
            onChange={(e) => setRegistrarSource(e.target.value)}
            className="border-outline-variant/40 bg-surface w-full rounded-xl border px-4 py-2.5"
          >
            {REGISTRAR_SOURCES.map((key) => (
              <option key={key} value={key}>
                {labels.registrarOptions[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:w-44 lg:shrink-0">
          <p className="text-on-surface-variant mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
            {labels.settingsNavLabel}
          </p>
          <nav className="flex flex-row gap-2 lg:flex-col">
            <button
              type="button"
              className={tabClass(panel === "nameservers")}
              onClick={() => setPanel("nameservers")}
            >
              {labels.settingsTabNs}
            </button>
            <button
              type="button"
              className={tabClass(panel === "glue")}
              onClick={() => setPanel("glue")}
            >
              {labels.settingsTabGlue}
            </button>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          {panel === "nameservers" ? (
            <DomainNameserversEditor
              nameservers={nameservers}
              onChange={setNameservers}
              translationScope="admin"
            />
          ) : (
            <DomainNsGlueEditor
              entries={nsGlueEntries}
              onChange={setNsGlueEntries}
              translationScope="admin"
              onValidationError={(msg) => {
                if (msg) toast(msg, "error");
              }}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave({ expiresAt, registrarSource, nameservers, nsGlueEntries })}
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

function DomainBillingRow({
  domain,
  disabled,
  onSave,
  onCreateInvoice,
  labels,
}: {
  domain: AdminManualDomain;
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
    domain.billingAmount != null ? String(domain.billingAmount) : "",
  );
  const [currency, setCurrency] = useState(domain.billingCurrency || "USD");

  useEffect(() => {
    setAmount(domain.billingAmount != null ? String(domain.billingAmount) : "");
    setCurrency(domain.billingCurrency || "USD");
  }, [domain.billingAmount, domain.billingCurrency, domain.id]);

  return (
    <div className="border-outline-variant/30 bg-surface-container-low/40 space-y-2 rounded-xl border p-3">
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
          className="border-outline-variant/40 bg-surface rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
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
      {domain.renewalInvoiceId ? (
        <p className="text-on-surface-variant text-xs">{labels.invoiceLinked}</p>
      ) : null}
    </div>
  );
}
