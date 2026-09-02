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
import { cn } from "@/lib/cn";
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

function storagePercent(used: number | null, quota: number | null): number | null {
  if (used == null || quota == null || quota <= 0) return null;
  return Math.min(100, Math.round((used / quota) * 100));
}

export function HostingMailSection({
  accountId,
  domain,
  enabled,
  compact = false,
}: {
  accountId: string;
  domain: string;
  enabled: boolean;
  compact?: boolean;
}): React.ReactElement | null {
  const locale = useLocale();
  const t = useTranslations("dashboard.pages.hosting.mail");
  const [summary, setSummary] = useState<PleskMailSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [webmailLoading, setWebmailLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getHostingMailSummary(accountId);
      setSummary(data);
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

  if (!enabled) return null;

  const count = summary?.count ?? 0;
  const max = summary?.maxMailboxes;
  const limitLabel =
    max != null && max > 0 ? t("countWithLimit", { count, max }) : t("countUnlimited", { count });
  const webmailHost = summary?.webmailHost ?? `webmail.${domain}`;

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

  const handleOpenWebmail = async (mailbox?: PleskMailbox) => {
    const key = mailbox?.address ?? "all";
    setWebmailLoading(key);
    try {
      await openHostingWebmail(accountId, {
        mailbox: mailbox?.name,
        directUrl: mailbox?.webmailUrl,
      });
    } catch (err) {
      if (mailbox?.webmailUrl) {
        window.open(mailbox.webmailUrl, "_blank", "noopener,noreferrer");
        return;
      }
      toast(getApiErrorMessage(err, t("webmailFailed")), "error");
    } finally {
      setWebmailLoading(null);
    }
  };

  const handleCopyEmail = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast(t("copiedEmail"), "success");
      window.setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast(t("copyFailed"), "error");
    }
  };

  const guideSteps = [
    { icon: "person_add", title: t("step1Title"), desc: t("step1Desc", { domain }) },
    { icon: "key", title: t("step2Title"), desc: t("step2Desc") },
    { icon: "mail", title: t("step3Title"), desc: t("step3Desc") },
  ] as const;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl",
        compact ? "dashboard-section-card" : "panel-card",
      )}
    >
      {!compact ? (
        <div className="border-b border-[color-mix(in_srgb,var(--separator)_80%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_10%,transparent),transparent)] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]">
                <MaterialIcon name="alternate_email" className="text-[24px]" />
              </span>
              <div>
                <h2 className="font-jakarta text-primary text-xl font-semibold">{t("title")}</h2>
                <p className="text-on-surface-variant mt-1 max-w-xl text-sm leading-relaxed">
                  {t("subtitle", { domain })}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] shadow-sm dark:bg-white/10">
              {loadingSummary && !summary ? t("loading") : limitLabel}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--separator)] px-5 py-4">
          <div>
            <h2 className="font-jakarta text-base font-bold text-[var(--label-primary)]">
              {t("title")}
            </h2>
            <p className="text-xs text-[var(--label-secondary)]">{t("subtitle", { domain })}</p>
          </div>
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {loadingSummary && !summary ? t("loading") : limitLabel}
          </span>
        </div>
      )}

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {!compact ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {guideSteps.map((step, index) => (
              <div
                key={step.icon}
                className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <MaterialIcon name={step.icon} className="text-[18px] text-[var(--accent)]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--label)]">{step.title}</p>
                <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,var(--separator))] bg-[color-mix(in_srgb,var(--accent)_5%,var(--bg-elevated))] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
                {t("webmailHostLabel")}
              </p>
              <p className="mt-1 font-mono text-base font-semibold text-[var(--label)]">
                {webmailHost}
              </p>
              <p className="text-on-surface-variant mt-2 text-sm">{t("webmailPasswordHint")}</p>
            </div>
            {summary && summary.mailboxes.length === 1 ? (
              <button
                type="button"
                disabled={webmailLoading !== null}
                onClick={() => void handleOpenWebmail(summary.mailboxes[0])}
                className="bg-primary text-on-primary inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
              >
                <MaterialIcon name="open_in_new" className="text-[18px]" />
                {webmailLoading ? t("openingWebmail") : t("openWebmail")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-on-surface-variant text-sm">{t("manageHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSummary()}
              disabled={loadingSummary}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--separator)] px-4 text-sm font-medium disabled:opacity-60"
            >
              <MaterialIcon name="refresh" className="text-[18px]" />
              {loadingSummary ? t("refreshing") : t("refresh")}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((value) => !value)}
              className="bg-primary text-on-primary inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
            >
              <MaterialIcon name="add" className="text-[18px]" />
              {t("createMailbox")}
            </button>
          </div>
        </div>

        {showCreate ? (
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_25%,var(--separator))] bg-[var(--bg-elevated)] p-4 sm:p-5">
            <h3 className="text-primary text-sm font-semibold">{t("createTitle")}</h3>
            <p className="text-on-surface-variant mt-1 text-xs">{t("createHint")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-[var(--label-secondary)]">
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
                  <span className="flex h-11 items-center border-l border-[var(--separator)] bg-[var(--bg-secondary)] px-3 text-sm font-medium text-[var(--label-secondary)]">
                    @{domain}
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--label-secondary)]">
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
                <label className="mb-1.5 block text-xs font-medium text-[var(--label-secondary)]">
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
          <LoadingSkeleton className="h-40 rounded-2xl" />
        ) : summary && summary.mailboxes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--separator)] px-4 py-12 text-center">
            <MaterialIcon
              name="inbox"
              className="mx-auto text-[40px] text-[var(--label-tertiary)]"
            />
            <p className="text-on-surface-variant mt-3 text-sm">{t("empty")}</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bg-primary text-on-primary mt-4 inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
            >
              {t("createMailbox")}
            </button>
          </div>
        ) : summary ? (
          <ul className="space-y-4">
            {summary.mailboxes.map((mailbox) => {
              const percent = storagePercent(mailbox.usedBytes, mailbox.quotaBytes);
              return (
                <li
                  key={mailbox.address}
                  className="overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-[var(--label)]">
                          {mailbox.address}
                        </p>
                        {!mailbox.enabled ? (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            {t("disabled")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyEmail(mailbox.address)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--separator)] px-3 text-xs font-medium"
                        >
                          <MaterialIcon
                            name={copiedAddress === mailbox.address ? "check" : "content_copy"}
                            className="text-[16px]"
                          />
                          {copiedAddress === mailbox.address ? t("copiedEmail") : t("copyEmail")}
                        </button>
                        {mailbox.forwarding ? (
                          <span className="inline-flex h-9 items-center rounded-lg bg-sky-500/10 px-3 text-xs font-medium text-sky-700">
                            {t("forwarding")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-[var(--label-secondary)]">
                          <span>{t("quota")}</span>
                          <span>
                            {formatBytes(mailbox.usedBytes, locale)} /{" "}
                            {formatBytes(mailbox.quotaBytes, locale)}
                          </span>
                        </div>
                        {percent != null ? (
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                percent > 85 ? "bg-amber-500" : "bg-[var(--accent)]",
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:min-w-[12rem]">
                      <button
                        type="button"
                        disabled={webmailLoading !== null}
                        onClick={() => void handleOpenWebmail(mailbox)}
                        className="bg-primary text-on-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
                      >
                        <MaterialIcon name="open_in_new" className="text-[18px]" />
                        {webmailLoading === mailbox.address
                          ? t("openingWebmail")
                          : t("openRoundcube")}
                      </button>
                      <p className="text-center text-[11px] text-[var(--label-tertiary)]">
                        {t("openWebmailFor", { email: mailbox.address })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-[var(--separator)] bg-[var(--bg-secondary)] px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => {
                        setResetTarget(mailbox.name);
                        setResetPassword("");
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 text-xs font-medium"
                    >
                      <MaterialIcon name="lock_reset" className="text-[16px]" />
                      {t("resetPassword")}
                    </button>
                    <button
                      type="button"
                      disabled={deletingName === mailbox.name}
                      onClick={() => void handleDelete(mailbox)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-[var(--bg-elevated)] px-3 text-xs font-medium text-red-600 disabled:opacity-60"
                    >
                      <MaterialIcon name="delete" className="text-[16px]" />
                      {deletingName === mailbox.name ? t("deleting") : t("delete")}
                    </button>
                  </div>

                  {resetTarget === mailbox.name ? (
                    <div className="flex flex-wrap items-end gap-2 border-t border-[var(--separator)] px-4 py-3 sm:px-5">
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
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
