"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import { MarketingShell } from "@/components/layout/marketing-shell";
import {
  type DomainSearchResult,
  initiateTransfer,
  registerDomain,
  searchDomains,
} from "@/features/domains";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

type Tab = "search" | "transfer";

function DomainSearchContent(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("domain");
  const accessToken = useAuthStore((s) => s.accessToken);
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [transferDomain, setTransferDomain] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [results, setResults] = useState<DomainSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const q = params.get("q");
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    searchDomains(q)
      .then(setResults)
      .catch(() => setError(t("searchFailed")))
      .finally(() => setLoading(false));
  }, [params, t]);

  const requireAuth = (): boolean => {
    if (accessToken) return true;
    router.push(`/login?next=/domains/search?q=${encodeURIComponent(query.trim())}`);
    return false;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const next = await searchDomains(query.trim());
      setResults(next);
      router.replace(`/domains/search?q=${encodeURIComponent(query.trim())}`);
    } catch {
      setError(t("searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (domain: string) => {
    if (!requireAuth()) return;
    setLoading(true);
    setError(null);
    try {
      await registerDomain(domain);
      setMessage(t("registeredSuccess", { domain }));
      router.push("/dashboard/domains");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("registerFailed");
      setError(msg ?? t("registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!requireAuth()) return;
    setLoading(true);
    setError(null);
    try {
      await initiateTransfer(transferDomain.trim(), authCode.trim());
      setMessage(t("transferInitiated", { domain: transferDomain.trim() }));
      router.push("/dashboard/domains");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("transferFailed");
      setError(msg ?? t("transferFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--label-secondary)] transition hover:text-[var(--accent)]"
      >
        <MaterialIcon name="arrow_back" className="text-[17px]" />
        {t("backHome")}
      </Link>

      <div className="mt-6 text-center sm:mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {t("title")}
        </p>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight text-[var(--label)]">
          {t("searchPageTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--label-secondary)]">
          {t("searchPageDescription")}
        </p>
      </div>

      <div className="mx-auto mt-8 flex w-fit rounded-full border border-[var(--separator)] bg-[var(--bg-secondary)] p-1">
        {(["search", "transfer"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={[
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              tab === item
                ? "bg-[var(--bg-elevated)] text-[var(--accent)] shadow-sm"
                : "text-[var(--label-secondary)] hover:text-[var(--label)]",
            ].join(" ")}
          >
            {item === "search" ? t("tabSearch") : t("tabTransfer")}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <div className="mt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSearch();
            }}
            className={[
              "shadow-apple-md flex flex-col overflow-hidden rounded-[22px] border bg-[var(--bg-elevated)] transition-[border-color,box-shadow] duration-300 sm:flex-row sm:rounded-full",
              focused
                ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--separator))] shadow-[0_18px_50px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                : "border-[var(--separator)]",
            ].join(" ")}
          >
            <div className="relative flex min-w-0 flex-1 items-center">
              <MaterialIcon
                name="language"
                className="pointer-events-none absolute left-5 text-[22px] text-[var(--accent)]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={t("queryPlaceholder")}
                className="h-14 w-full bg-transparent pl-14 pr-4 text-[16px] text-[var(--label)] outline-none placeholder:text-[var(--label-tertiary)] sm:h-[3.75rem]"
              />
            </div>
            <div className="border-t border-[var(--separator)] p-2 sm:border-t-0">
              <button
                type="submit"
                disabled={loading}
                className="apple-btn apple-btn-primary h-11 w-full rounded-full px-6 disabled:opacity-60 sm:h-full sm:min-w-[10rem]"
              >
                {loading ? t("searching") : t("searchDomains")}
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {loading && results.length === 0 ? (
              <div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-5 py-8 text-center text-sm text-[var(--label-secondary)]">
                {t("searching")}
              </div>
            ) : null}

            {results.map((result) => (
              <div
                key={result.domain}
                className="shadow-apple flex flex-col gap-4 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      result.available
                        ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                        : "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
                    ].join(" ")}
                  >
                    <MaterialIcon
                      name={result.available ? "check_circle" : "cancel"}
                      className="text-[22px]"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[var(--label)]">
                      {result.domain}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--label-secondary)]">
                      {result.available ? t("available") : t("unavailable")}
                      {result.premium ? ` · ${t("premium")}` : ""}
                      {" · "}
                      <span className="font-medium text-[var(--label)]">
                        ${result.price.toFixed(2)}
                        {t("perYear")}
                      </span>
                    </p>
                  </div>
                </div>
                {result.available ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleRegister(result.domain)}
                    className="apple-btn apple-btn-primary w-full rounded-full !px-5 !py-2.5 text-sm sm:w-auto"
                  >
                    {t("register")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="shadow-apple mt-6 space-y-3 rounded-[24px] border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
          <input
            value={transferDomain}
            onChange={(e) => setTransferDomain(e.target.value)}
            placeholder={t("transferPlaceholder")}
            className="h-12 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
          />
          <input
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            placeholder={t("authCodePlaceholder")}
            className="h-12 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
          />
          <button
            type="button"
            onClick={() => void handleTransfer()}
            disabled={loading}
            className="apple-btn apple-btn-primary h-12 w-full rounded-full disabled:opacity-60"
          >
            {loading ? t("submitting") : t("startTransfer")}
          </button>
        </div>
      )}

      {message ? (
        <p className="mt-4 rounded-2xl bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-4 py-3 text-sm text-[var(--success)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function DomainSearchPage(): React.ReactElement {
  const tu = useTranslations("ui");

  return (
    <MarketingShell>
      <div className="max-w-container-max mx-auto px-5 pb-20 pt-28 md:px-8">
        <Suspense fallback={<p className="text-[var(--label-secondary)]">{tu("loading")}</p>}>
          <DomainSearchContent />
        </Suspense>
      </div>
    </MarketingShell>
  );
}
