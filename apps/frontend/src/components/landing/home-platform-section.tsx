"use client";

import { useTranslations } from "next-intl";

import { HomeIcon, type HomeIconName } from "./home-icon";

import { Link } from "@/i18n/navigation";

const features: Array<{ key: string; icon: HomeIconName }> = [
  { key: "security", icon: "shield" },
  { key: "control", icon: "sliders" },
  { key: "support", icon: "support" },
];

export function HomePlatformSection(): React.ReactElement {
  const t = useTranslations("homeRedesign");
  return (
    <section
      className="home-platform home-section"
      id="infrastructure"
      aria-labelledby="home-platform-title"
    >
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">{t("platformEyebrow")}</p>
            <h2 id="home-platform-title">{t("platformTitle")}</h2>
          </div>
          <p className="home-platform-intro">{t("platformDescription")}</p>
        </div>
        <div className="home-platform-grid">
          <article className="home-deploy-feature">
            <div>
              <span className="home-feature-icon">
                <HomeIcon name="code" />
              </span>
              <h3>{t("deployTitle")}</h3>
              <p>{t("deployDescription")}</p>
            </div>
            <div className="home-deploy-flow" aria-hidden="true">
              <span>
                <HomeIcon name="code" /> Git / ZIP
              </span>
              <i />
              <span>
                <HomeIcon name="cloud" /> Vexira
              </span>
              <i />
              <span className="home-deploy-ready">
                <HomeIcon name="check" /> HTTPS
              </span>
            </div>
            <div className="home-frameworks">
              <span>Next.js</span>
              <span>NestJS</span>
              <span>.NET</span>
              <small>PM2 / Docker</small>
            </div>
            <Link href="/hosting" className="home-text-link">
              {t("deployLink")}
              <HomeIcon name="arrow" />
            </Link>
          </article>
          <div className="home-platform-features">
            {features.map((feature) => (
              <article key={feature.key} className="home-feature-row">
                <span className="home-feature-icon">
                  <HomeIcon name={feature.icon} />
                </span>
                <div>
                  <h3>{t(`${feature.key}Title`)}</h3>
                  <p>{t(`${feature.key}Description`)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
