"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { HomeIcon } from "@/components/landing/home-icon";
import {
  isValidHostingDomain,
  normalizeHostingDomain,
  type HostingDomainChoice,
  type HostingDomainMode,
} from "@/lib/hosting-domain";
import { formatStorefrontMoney } from "@/lib/i18n/format";
import { apiClient } from "@/services/api-client";

export function HostingDomainPicker({
  currency,
  initial,
  busy,
  onConfirm,
}: {
  currency: string;
  initial?: HostingDomainChoice;
  busy?: boolean;
  onConfirm: (value: HostingDomainChoice) => void;
}) {
  const t = useTranslations("hostingDomain");
  const locale = useLocale();
  const [mode, setMode] = useState<HostingDomainMode>(initial?.mode ?? "register");
  const [name, setName] = useState(initial?.name ?? "");
  const [quote, setQuote] = useState<HostingDomainChoice | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  function reset() {
    revision.current++;
    setQuote(null);
    setChecking(false);
    setError("");
  }
  async function check(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeHostingDomain(name);
    if (!isValidHostingDomain(normalized)) {
      setError(t("invalid"));
      return;
    }
    if (mode === "existing") {
      onConfirm({ name: normalized, mode, price: 0, currency });
      return;
    }
    const current = ++revision.current;
    setChecking(true);
    setError("");
    setQuote(null);
    try {
      const result = await apiClient.request<HostingDomainChoice>("/domains/checkout-quote", {
        params: { name: normalized, mode, currency },
      });
      if (revision.current === current) {
        if (
          !result.data ||
          result.data.currency !== currency ||
          result.data.mode !== mode ||
          result.data.name !== normalized
        )
          throw new Error("quote");
        setQuote(result.data);
      }
    } catch {
      if (revision.current === current) setError(t("unavailable"));
    } finally {
      if (revision.current === current) setChecking(false);
    }
  }
  return (
    <div className="hosting-domain-picker">
      <div className="hosting-domain-options" role="radiogroup" aria-label={t("title")}>
        {(["register", "transfer", "existing"] as const).map((value) => (
          <label
            key={value}
            className={`hosting-domain-option ${mode === value ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="hosting-domain-mode"
              value={value}
              checked={mode === value}
              disabled={busy}
              onChange={() => {
                reset();
                setMode(value);
              }}
            />
            <span>
              <strong>{t(value)}</strong>
              <small>{t(`${value}Description`)}</small>
            </span>
          </label>
        ))}
      </div>
      <form onSubmit={check}>
        <label htmlFor="hosting-domain-name">{t("domain")}</label>
        <div className="hosting-domain-search">
          <input
            id="hosting-domain-name"
            value={name}
            onChange={(event) => {
              reset();
              setName(event.target.value);
            }}
            placeholder="example.com"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={253}
            disabled={busy}
            required
          />
          <button type="submit" disabled={busy || checking}>
            {checking ? t("checking") : mode === "existing" ? t("continue") : t("check")}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {mode !== "existing" && (
        <p className="purchase-muted">
          {t(mode === "transfer" ? "transferNote" : "processingNote")}
        </p>
      )}
      {quote && (
        <div className="hosting-domain-result" role="status">
          <div>
            <strong>{quote.name}</strong>
            <span>
              {formatStorefrontMoney(quote.price, quote.currency, locale)}{" "}
              <small>{t("year")}</small>
            </span>
          </div>
          <button
            type="button"
            className="purchase-cta"
            disabled={busy || quote.currency !== currency}
            onClick={() => onConfirm(quote)}
          >
            {t("continue")}
            <HomeIcon name="arrow" />
          </button>
        </div>
      )}
    </div>
  );
}
