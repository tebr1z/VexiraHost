"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import {
  type DomainSearchResult,
  registerDomain,
  searchDomains,
} from "@/features/domains";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function DomainSearch(): React.ReactElement {
  const t = useTranslations("domain");
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DomainSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!accessToken) {
      router.push(`/login?next=/domains/search?q=${encodeURIComponent(domain)}`);
      return;
    }
    setRegistering(domain);
    setError(null);
    try {
      await registerDomain(domain);
      router.push("/dashboard/domains");
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("registerFailed");
      setError(message ?? t("registerFailed"));
    } finally {
      setRegistering(null);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-container-max px-5 md:px-8">
      <div className="apple-card mx-auto max-w-2xl p-5 sm:p-6">
        <div className="mb-4 text-center sm:text-left">
          <h3 className="text-xl font-semibold tracking-tight text-[var(--label)]">{t("title")}</h3>
          <p className="mt-1 text-sm text-[var(--label-secondary)]">{t("subtitle")}</p>
          <Link
            href="/domains/search"
            className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {t("advanced")}
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--label-tertiary)]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("placeholder")}
              className="h-11 w-full rounded-[10px] border-[0.5px] border-[var(--separator)] bg-[var(--bg-secondary)] pl-10 pr-4 text-[17px] text-[var(--label)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="apple-btn apple-btn-primary h-11 shrink-0 disabled:opacity-50"
          >
            {loading ? t("searching") : t("search")}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--separator)] overflow-hidden rounded-[10px] border-[0.5px] border-[var(--separator)]">
            {results.map((result) => (
              <li
                key={result.domain}
                className="flex flex-col gap-2 bg-[var(--bg-secondary)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium text-[var(--label)]">{result.domain}</span>
                  <span className="ml-2 text-sm text-[var(--label-secondary)]">
                    {result.available ? (
                      <span className="text-[var(--success)]">{t("available")}</span>
                    ) : (
                      <span className="text-[var(--danger)]">{t("taken")}</span>
                    )}
                    {result.premium ? ` · ${t("premium")}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    ${result.price.toFixed(2)}
                    {t("perYear")}
                  </span>
                  {result.available && (
                    <button
                      type="button"
                      disabled={registering === result.domain}
                      onClick={() => handleRegister(result.domain)}
                      className="apple-btn apple-btn-primary !px-3 !py-1.5 text-sm disabled:opacity-50"
                    >
                      {registering === result.domain ? "..." : t("register")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-[var(--label-secondary)] sm:justify-start">
          <span>
            {t("tldCom")} <strong className="text-[var(--label)]">$9.99</strong>
          </span>
          <span>
            {t("tldNet")} <strong className="text-[var(--label)]">$11.99</strong>
          </span>
          <span>
            {t("tldAi")} <strong className="text-[var(--label)]">$69.00</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
