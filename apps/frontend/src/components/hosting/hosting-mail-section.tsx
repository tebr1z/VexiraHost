"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  createHostingMailbox,
  deleteHostingMailbox,
  getHostingMailSummary,
  openHostingWebmail,
  updateHostingMailbox,
  type PleskMailSummary,
  type PleskMailbox,
} from "@/features/hosting/services/hosting-mail.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

function formatBytes(bytes: number | null | undefined, locale: string): string {
  if (bytes == null || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function HostingMailSection({
  accountId,
  domain,
  enabled,
}: {
  accountId: string;
  domain: string;
  enabled: boolean;
}): React.ReactElement | null {
  const locale = useLocale();
  const t = useTranslations("dashboard.pages.hosting.mail");
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<PleskMailSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [webmailLoading, setWebmailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getHostingMailSummary(accountId);
      setSummary(data);
      setLoadedOnce(true);
    } catch (err) {
      toast(getApiErrorMessage(err, t("loadFailed")), "error");
    } finally {
      setLoadingSummary(false);
    }
  }, [accountId, t]);

  useEffect(() => {
    if (!enabled) return;
    void loadSummary();
  }, [enabled, loadSummary]);

  useEffect(() => {
    if (expanded && enabled && !loadedOnce && !loadingSummary) {
      void loadSummary();
    }
  }, [expanded, enabled, loadedOnce, loadingSummary, loadSummary]);

  if (!enabled) return null;

  const count = summary?.count ?? 0;
  const max = summary?.maxMailboxes;
  const limitLabel =
    max != null && max > 0 ? t("countWithLimit", { count, max }) : t("countUnlimited", { count });

  const handleCreate = async () => {
    const name = localPart.trim().toLowerCase();
    if (!name) {
      toast(t("nameRequired"), "error");
      return;
    }
    if (password.length < 8) {
      toast(t("passwordMin"), "error");
      return;
    }
    if (password !== confirmPassword) {
      toast(t("passwordMismatch"), "error");
      return;
    }

    setCreating(true);
    try {
      await createHostingMailbox(accountId, { name, password });
      toast(t("created"), "success");
      setLocalPart("");
      setPassword("");
      setConfirmPassword("");
      setShowCreate(false);
      await loadSummary();
    } catch (err) {
      toast(getApiErrorMessage(err, t("createFailed")), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (mailbox: PleskMailbox) => {
    if (!window.confirm(t("deleteConfirm", { email: mailbox.address }))) return;
    setDeletingName(mailbox.name);
    try {
      await deleteHostingMailbox(accountId, mailbox.name);
      toast(t("deleted"), "success");
      await loadSummary();
    } catch (err) {
      toast(getApiErrorMessage(err, t("deleteFailed")), "error");
    } finally {
      setDeletingName(null);
    }
  };

  const handleResetPassword = async (name: string) => {
    if (resetPassword.length < 8) {
      toast(t("passwordMin"), "error");
      return;
    }
    setResetSaving(true);
    try {
      await updateHostingMailbox(accountId, name, { password: resetPassword });
      toast(t("passwordUpdated"), "success");
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast(getApiErrorMessage(err, t("updateFailed")), "error");
    } finally {
      setResetSaving(false);
    }
  };

  const handleWebmail = async () => {
    setWebmailLoading(true);
    try {
      await openHostingWebmail(accountId);
      toast(t("openingWebmail"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, t("webmailFailed")), "error");
    } finally {
      setWebmailLoading(false);
    }
  };

  return (
    <section className="panel-card overflow-hidden rounded-2xl">
      <div className="border-b border-[color-mix(in_srgb,var(--separator)_80%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_8%,transparent),transparent)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
              <MaterialIcon name="mail" className="text-[22px]" />
            </span>
            <div>
              <h2 className="font-jakarta text-primary text-lg font-semibold">{t("title")}</h2>
              <p className="text-on-surface-variant mt-0.5 text-sm">{t("subtitle", { domain })}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--accent)] shadow-sm dark:bg-white/10">
              {loadingSummary && !summary ? t("loading") : limitLabel}
            </span>
            <button
              type="button"
              disabled={webmailLoading}
              onClick={handleWebmail}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--separator)] bg-white px-3 text-sm font-medium text-[var(--label)] shadow-sm transition hover:bg-[var(--bg-secondary)] disabled:opacity-60 dark:bg-transparent"
            >
              <MaterialIcon name="open_in_new" className="text-[16px]" />
              {webmailLoading ? t("openingWebmail") : t("openWebmail")}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 py-3 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--separator))]"
        >
          <span className="text-sm font-medium text-[var(--label)]">
            {expanded ? t("hideMailboxes") : t("showMailboxes")}
          </span>
          <MaterialIcon
            name={expanded ? "expand_less" : "expand_more"}
            className="text-[20px] text-[var(--label-secondary)]"
          />
        </button>

        {expanded ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-on-surface-variant text-sm">{t("manageHint")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadSummary()}
                  disabled={loadingSummary}
                  className="inline-flex h-9 items-center rounded-lg border border-[var(--separator)] px-3 text-sm font-medium disabled:opacity-60"
                >
                  {loadingSummary ? t("refreshing") : t("refresh")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate((v) => !v)}
                  className="bg-primary text-on-primary inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold"
                >
                  <MaterialIcon name="add" className="text-[18px]" />
                  {t("createMailbox")}
                </button>
              </div>
            </div>

            {showCreate ? (
              <div className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_25%,var(--separator))] bg-[color-mix(in_srgb,var(--accent)_4%,var(--bg-elevated))] p-4 sm:p-5">
                <h3 className="text-primary text-sm font-semibold">{t("createTitle")}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--label-secondary)]">
                      {t("emailAddress")}
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-[var(--separator)] bg-white dark:bg-transparent">
                      <input
                        value={localPart}
                        onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                        placeholder="info"
                        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none"
                        autoComplete="off"
                      />
                      <span className="flex h-11 items-center border-l border-[var(--separator)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--label-secondary)]">
                        @{domain}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--label-secondary)]">
                      {t("password")}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-outline-variant h-11 w-full rounded-xl border px-3 text-sm"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--label-secondary)]">
                      {t("confirmPassword")}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-outline-variant h-11 w-full rounded-xl border px-3 text-sm"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => void handleCreate()}
                    className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
                  >
                    {creating ? t("creating") : t("createSubmit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="inline-flex h-10 items-center rounded-xl border border-[var(--separator)] px-4 text-sm font-medium"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            ) : null}

            {loadingSummary && !summary ? (
              <LoadingSkeleton className="h-32 rounded-xl" />
            ) : summary && summary.mailboxes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--separator)] px-4 py-10 text-center">
                <MaterialIcon
                  name="inbox"
                  className="mx-auto text-[32px] text-[var(--label-tertiary)]"
                />
                <p className="text-on-surface-variant mt-2 text-sm">{t("empty")}</p>
              </div>
            ) : summary ? (
              <ul className="space-y-3">
                {summary.mailboxes.map((mailbox) => (
                  <li
                    key={mailbox.address}
                    className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--label)]">
                            {mailbox.address}
                          </p>
                          {!mailbox.enabled ? (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              {t("disabled")}
                            </span>
                          ) : null}
                          {mailbox.forwarding ? (
                            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                              {t("forwarding")}
                            </span>
                          ) : null}
                          {mailbox.autoresponder ? (
                            <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              {t("autoresponder")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-on-surface-variant mt-1 text-xs">
                          {t("quota")}: {formatBytes(mailbox.usedBytes, locale)} /{" "}
                          {formatBytes(mailbox.quotaBytes, locale)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(mailbox.name);
                            setResetPassword("");
                          }}
                          className="inline-flex h-8 items-center rounded-lg border border-[var(--separator)] px-3 text-xs font-medium"
                        >
                          {t("resetPassword")}
                        </button>
                        <button
                          type="button"
                          disabled={deletingName === mailbox.name}
                          onClick={() => void handleDelete(mailbox)}
                          className="inline-flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 disabled:opacity-60"
                        >
                          {deletingName === mailbox.name ? t("deleting") : t("delete")}
                        </button>
                      </div>
                    </div>

                    {resetTarget === mailbox.name ? (
                      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--separator)] pt-3">
                        <input
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder={t("newPassword")}
                          className="border-outline-variant h-10 min-w-[12rem] flex-1 rounded-lg border px-3 text-sm"
                        />
                        <button
                          type="button"
                          disabled={resetSaving}
                          onClick={() => void handleResetPassword(mailbox.name)}
                          className="bg-primary text-on-primary inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold disabled:opacity-60"
                        >
                          {resetSaving ? t("saving") : t("savePassword")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetTarget(null)}
                          className="inline-flex h-10 items-center rounded-lg border border-[var(--separator)] px-3 text-sm"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
