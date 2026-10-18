"use client";

import { useTranslations } from "next-intl";

import { HomeIcon, type HomeIconName } from "./home-icon";

import { Link } from "@/i18n/navigation";

const services: Array<{ key: "web" | "mobile" | "desktop"; icon: HomeIconName; stack: string }> = [
  { key: "web", icon: "globe", stack: "Next.js · NestJS · .NET" },
  { key: "mobile", icon: "layers", stack: "iOS · Android · Cross-platform" },
  { key: "desktop", icon: "code", stack: "Windows · macOS · Linux" },
];

export function HomeDevelopmentSection(): React.ReactElement {
  const t = useTranslations("homeDevelopment");
  return (
    <section className="home-development home-section" aria-labelledby="home-development-title">
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">{t("eyebrow")}</p>
            <h2 id="home-development-title">{t("title")}</h2>
          </div>
          <p className="home-platform-intro">{t("description")}</p>
        </div>
        <div className="home-development-grid">
          {services.map((service, index) => (
            <article key={service.key} className="home-development-card">
              <div className="home-development-card-top">
                <span className="home-feature-icon">
                  <HomeIcon name={service.icon} />
                </span>
                <span>0{index + 1}</span>
              </div>
              <h3>{t(`${service.key}Title`)}</h3>
              <p>{t(`${service.key}Description`)}</p>
              <div className="home-development-stack">{service.stack}</div>
            </article>
          ))}
        </div>
        <div className="home-development-cta">
          <div>
            <strong>{t("ctaTitle")}</strong>
            <p>{t("ctaDescription")}</p>
          </div>
          <Link href="/contact" className="home-button home-button-primary">
            {t("ctaButton")}
            <HomeIcon name="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
