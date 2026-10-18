"use client";

import { useTranslations } from "next-intl";

import { DomainSearch } from "./domain-search";
import { HeroShowcase } from "./hero-showcase";
import { HomeIcon } from "./home-icon";

import { Link } from "@/i18n/navigation";

export function HeroSection(): React.ReactElement {
  const t = useTranslations("homeRedesign");

  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container">
        <div className="home-hero-layout">
          <div className="home-hero-copy">
            <p className="home-eyebrow">
              <span className="home-status-dot" /> {t("eyebrow")}
            </p>
            <h1 id="home-title">
              {t("heroTitle")} <span>{t("heroAccent")}</span>
            </h1>
            <p className="home-hero-description">{t("heroDescription")}</p>
            <div className="home-actions">
              <a href="#pricing" className="home-button home-button-primary">
                {t("explorePlans")} <HomeIcon name="arrow" />
              </a>
              <Link href="/contact" className="home-text-link">
                {t("talkToUs")} <HomeIcon name="arrow" />
              </Link>
            </div>
            <ul className="home-hero-trust">
              {["heroTrust1", "heroTrust2", "heroTrust3"].map((key) => (
                <li key={key}>
                  <HomeIcon name="check" /> {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <HeroShowcase />
        </div>
        <DomainSearch />
      </div>
    </section>
  );
}
