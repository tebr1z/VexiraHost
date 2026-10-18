"use client";

import { asString, asStringArray, CmsSectionShell } from "../cms-section-shell";

import { HeroShowcase } from "@/components/landing/hero-showcase";
import { HomeIcon } from "@/components/landing/home-icon";
import type { PublicCmsSection } from "@/features/cms/types";
import { Link } from "@/i18n/navigation";

export function CmsHeroSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const c = section.content;
  const perks = asStringArray(c.perks);
  return (
    <CmsSectionShell design={section.design} className="hosting-hero vexira-service-hero">
      <div className="home-container vexira-service-hero-layout">
        <div className="vexira-service-hero-copy">
          <p className="home-eyebrow">VEXIRA HOST</p>
          <h1>{asString(c.title)}</h1>
          <p className="vexira-service-description">{asString(c.subtitle)}</p>
          {perks.length ? (
            <ul className="vexira-service-perks">
              {perks.map((perk) => (
                <li key={perk}>
                  <HomeIcon name="check" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="home-actions">
            {asString(c.ctaPrimary) ? (
              <a
                href={asString(c.ctaPrimaryHref) || "#hosting-plans"}
                className="home-button home-button-primary"
              >
                {asString(c.ctaPrimary)}
                <HomeIcon name="arrow" />
              </a>
            ) : null}
            {asString(c.ctaSecondary) ? (
              <Link href={asString(c.ctaSecondaryHref) || "/register"} className="home-text-link">
                {asString(c.ctaSecondary)}
                <HomeIcon name="arrow" />
              </Link>
            ) : null}
          </div>
          {asString(c.moneyBack) ? (
            <p className="vexira-service-note">{asString(c.moneyBack)}</p>
          ) : null}
        </div>
        <HeroShowcase showDeploy={false} />
      </div>
    </CmsSectionShell>
  );
}
