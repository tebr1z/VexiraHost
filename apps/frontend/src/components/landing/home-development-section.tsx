"use client";

import { useTranslations } from "next-intl";

import { HomeIcon, type HomeIconName } from "./home-icon";
import { TechnologyLogo } from "./technology-logo";

import { Link } from "@/i18n/navigation";

const services: Array<{ key: "web" | "mobile" | "desktop"; icon: HomeIconName; stack: string }> = [
  { key: "web", icon: "globe", stack: "Next.js · NestJS · .NET" },
  { key: "mobile", icon: "layers", stack: "iOS · Android · Cross-platform" },
  { key: "desktop", icon: "code", stack: "Windows · macOS · Linux" },
];

const technologies = [
  { name: "React", color: "#087ea4" },
  { name: "Node.js", color: "#5fa04e" },
  { name: "Vue.js", color: "#42b883" },
  { name: "Next.js", color: "var(--home-ink)" },
  { name: "NestJS", color: "#e0234e" },
  { name: "TypeScript", color: "#3178c6" },
  { name: "JavaScript", color: "#f7df1e" },
  { name: ".NET", color: "#512bd4" },
  { name: "Python", color: "#3776ab" },
  { name: "PHP", color: "#777bb4" },
  { name: "Java", color: "#e76f00" },
  { name: "Kotlin", color: "#7f52ff" },
  { name: "Flutter", color: "#02569b" },
  { name: "Go", color: "#00add8" },
  { name: "Docker", color: "#2496ed" },
  { name: "PostgreSQL", color: "#4169e1" },
] as const;

function TechnologyRow({ hidden = false }: { hidden?: boolean }): React.ReactElement {
  return (
    <div className="home-tech-row" aria-hidden={hidden || undefined}>
      {technologies.map((technology) => (
        <span className="home-tech-item" key={technology.name}>
          <span
            className="home-tech-mark"
            style={{ "--tech-color": technology.color } as React.CSSProperties}
            aria-hidden="true"
          >
            <TechnologyLogo name={technology.name} />
          </span>
          {technology.name}
        </span>
      ))}
    </div>
  );
}

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
        <div className="home-tech-banner" aria-label={t("technologyLabel")}>
          <div className="home-tech-banner-heading">
            <span className="home-tech-pulse" aria-hidden="true" />
            {t("technologyLabel")}
          </div>
          <div className="home-tech-viewport">
            <div className="home-tech-track">
              <TechnologyRow />
              <TechnologyRow hidden />
            </div>
          </div>
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
