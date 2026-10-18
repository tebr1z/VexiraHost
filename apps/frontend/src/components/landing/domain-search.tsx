"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { HomeIcon } from "./home-icon";

import { useRouter } from "@/i18n/navigation";

export function DomainSearch(): React.ReactElement {
  const t = useTranslations("domain");
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const domain = query.trim();
    if (domain) router.push(`/domains/search?q=${encodeURIComponent(domain)}`);
  }

  return (
    <div className="home-domain-bar">
      <div className="home-domain-copy">
        <HomeIcon name="globe" />
        <div>
          <h2>{t("title")}</h2>
          <p>
            .com <span>·</span> .net <span>·</span> .az <span>·</span> .ai
          </p>
        </div>
      </div>
      <form onSubmit={handleSearch} className="home-domain-form" role="search">
        <label htmlFor="home-domain-input" className="sr-only">
          {t("title")}
        </label>
        <input
          id="home-domain-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("placeholder")}
          required
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="home-button home-button-primary">
          <span>{t("search")}</span>
          <HomeIcon name="search" />
        </button>
      </form>
    </div>
  );
}
