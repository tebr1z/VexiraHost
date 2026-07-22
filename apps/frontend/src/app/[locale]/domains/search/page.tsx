"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { MarketingShell } from "@/components/layout/marketing-shell";

import {
  type DomainSearchResult,
  initiateTransfer,
  registerDomain,
  searchDomains,
} from "@/features/domains";
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

  useEffect(() => {
    const q = params.get("q");
    if (q) {
      setQuery(q);
      searchDomains(q).then(setResults).catch(() => undefined);
    }
  }, [params]);

  const requireAuth = (): boolean => {
    if (accessToken) return true;
    router.push("/login?next=/domains/search");
    return false;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchDomains(query.trim()));
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-secondary hover:underline">
          {t("backHome")}
        </Link>
        <h1 className="mt-4 font-jakarta text-3xl font-bold text-primary">{t("searchPageTitle")}</h1>
        <p className="mt-2 text-on-surface-variant">{t("searchPageDescription")}</p>
      </div>

      <div className="flex gap-2">
        {(["search", "transfer"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === item
                ? "bg-primary text-on-primary"
                : "border border-outline-variant text-on-surface-variant"
            }`}
          >
            {item === "search" ? t("tabSearch") : t("tabTransfer")}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <div className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6 shadow-precision">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("queryPlaceholder")}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="h-12 rounded-xl bg-primary px-6 font-semibold text-on-primary disabled:opacity-60"
          >
            {loading ? t("searching") : t("searchDomains")}
          </button>
          <ul className="space-y-3">
            {results.map((result) => (
              <li
                key={result.domain}
                className="flex flex-col gap-2 rounded-xl border border-outline-variant/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{result.domain}</p>
                  <p className="text-sm text-on-surface-variant">
                    {result.available ? t("available") : t("unavailable")} · ${result.price.toFixed(2)}
                    {t("perYear")}
                  </p>
                </div>
                {result.available && (
                  <button
                    type="button"
                    onClick={() => handleRegister(result.domain)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
                  >
                    {t("register")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6 shadow-precision">
          <input
            value={transferDomain}
            onChange={(e) => setTransferDomain(e.target.value)}
            placeholder={t("transferPlaceholder")}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          />
          <input
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            placeholder={t("authCodePlaceholder")}
            className="h-12 w-full rounded-xl border border-outline-variant px-4"
          />
          <button
            type="button"
            onClick={handleTransfer}
            disabled={loading}
            className="h-12 rounded-xl bg-primary px-6 font-semibold text-on-primary disabled:opacity-60"
          >
            {loading ? t("submitting") : t("startTransfer")}
          </button>
        </div>
      )}

      {message && <p className="text-secondary">{message}</p>}
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}

export default function DomainSearchPage(): React.ReactElement {
  const tu = useTranslations("ui");

  return (
    <MarketingShell>
      <div className="mx-auto max-w-container-max px-margin-mobile py-stack-md md:px-margin-desktop">
        <Suspense fallback={<p className="text-on-surface-variant">{tu("loading")}</p>}>
          <DomainSearchContent />
        </Suspense>
      </div>
    </MarketingShell>
  );
}
