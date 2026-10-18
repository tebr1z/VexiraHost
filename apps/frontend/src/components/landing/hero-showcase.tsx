"use client";

import { useTranslations } from "next-intl";

import { HomeIcon } from "./home-icon";

export function HeroShowcase({
  showDeploy = true,
}: { showDeploy?: boolean } = {}): React.ReactElement {
  const t = useTranslations("homeRedesign");

  return (
    <div className="home-cloud-scene" role="img" aria-label={t("visualAlt")}>
      <div className="home-scene-grid" />
      <div className="home-orbit home-orbit-outer" />
      <div className="home-orbit home-orbit-inner" />
      <div className="home-orbit-dot home-orbit-dot-one" />
      <div className="home-orbit-dot home-orbit-dot-two" />
      <div className="home-scene-chip home-chip-ssl">
        <span className="home-scene-chip-icon">
          <HomeIcon name="shield" />
        </span>
        <span>
          <small>{t("protected")}</small>
          <strong>SSL & HTTPS</strong>
        </span>
      </div>
      {showDeploy ? (
        <div className="home-scene-chip home-chip-deploy">
          <span className="home-scene-chip-icon">
            <HomeIcon name="code" />
          </span>
          <span>
            <small>{t("yourStack")}</small>
            <strong>Next.js · NestJS · .NET</strong>
          </span>
        </div>
      ) : null}
      <div className="home-cloud-core">
        <div className="home-cloud-symbol">
          <HomeIcon name="cloud" />
        </div>
        <span>VEXIRA</span>
        <strong>CLOUD</strong>
        <div className="home-cloud-base">
          <span />
          <span />
          <span />
          <i />
        </div>
      </div>
      <div className="home-server-stack" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div className="home-server-unit" key={row}>
            <span className="home-server-slots" />
            <span className="home-server-led" />
            <span className="home-server-led" />
          </div>
        ))}
      </div>
      <div className="home-scene-caption">
        <span className="home-status-dot" /> {t("onePlatform")}
      </div>
    </div>
  );
}
